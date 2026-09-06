"use client";

/**
 * The documents screen: one list, filtered along five axes from the side
 * panel -- general views, matters, clients, document type, tags.
 *
 * Every filter is applied on the server. The tree's counts come from one
 * facets request, not from loading every document and counting in the
 * browser, so a firm with a thousand files does not download them to filter
 * them. Filters combine as AND; each active one is a removable chip above
 * the list, because a filter that is not visible makes a lawyer think a file
 * is lost.
 *
 * Two views of the same list (T-032): the table, and cards with a thumbnail
 * where one is honest. The choice is a display preference, kept per browser
 * in localStorage. Tags are managed from here too, and put on a document from
 * its row or its card; the type is changed from a dialog, never prompt().
 *
 * Deliberately absent: favourites, archive, deleted. There is no backend for
 * any of them (no column, no soft delete), and a "Deleted" folder that is
 * empty forever tells a lawyer a deleted file can be recovered when it cannot.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import {
  DocumentIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  ListBulletIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TagIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { API_BASE } from "@/lib/api";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  DOC_TYPES,
  type DocumentStatus,
  type MatterDocument,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useDocTypeLabel, useEnumLabel } from "@/lib/i18n/enum-label";
import { DocumentCard, fileIcon, type CardDocument } from "@/components/documents/DocumentCard";
import { TagsDialog, TagToken } from "@/components/documents/TagsDialog";
import { DocTypeDialog } from "@/components/documents/DocTypeDialog";
import { ManageTagsDialog } from "@/components/documents/ManageTagsDialog";
import { MatterTypeIcon } from "@/components/Distinction";

const STATUS_BADGE_COLOR: Record<
  DocumentStatus,
  "neutral" | "warn" | "accent" | "success" | "info"
> = {
  draft: "neutral",
  under_review: "warn",
  signed: "success",
  filed: "info",
  final: "success",
};

/** The general views: one list, three ways in. */
type View = "all" | "recent" | "unfiled";

const RECENT_LIMIT = 20;
const PAGE_SIZE = 100;
const OPEN_GROUPS_KEY = "legalos-documents-tree-open";
const VIEW_KEY = "legalos-documents-view";
type ViewMode = "list" | "cards";
const GROUPS = ["general", "matters", "clients", "types", "tags"] as const;
type Group = (typeof GROUPS)[number];

interface Filters {
  view: View;
  matterId: number | null;
  clientId: number | null;
  docType: string | null;
  tagIds: number[];
}

const NO_FILTERS: Filters = { view: "all", matterId: null, clientId: null, docType: null, tagIds: [] };

interface DocRow extends Record<string, unknown> {
  id: number;
  name: string;
  contentType: string;
  docType: string;
  matterId: number | null;
  matterName: string | null;
  status: DocumentStatus;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  hasFile: boolean;
  tagIds: number[];
}

/** Which tree groups are open, remembered per browser. */
function useOpenGroups() {
  const [open, setOpen] = useState<Record<Group, boolean>>(
    () => Object.fromEntries(GROUPS.map((g) => [g, true])) as Record<Group, boolean>,
  );
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_GROUPS_KEY);
      if (raw) setOpen((current) => ({ ...current, ...(JSON.parse(raw) as Partial<Record<Group, boolean>>) }));
    } catch {
      /* storage unavailable: everything stays open */
    }
  }, []);
  function toggle(group: Group, isOpen: boolean) {
    setOpen((current) => {
      const next = { ...current, [group]: isOpen };
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* not persisted this time */
      }
      return next;
    });
  }
  return { open, toggle };
}

/**
 * List or cards, remembered per browser. Read after mount so the server and
 * the first client render agree; every storage access is guarded because a
 * private window or blocked storage throws and the page must still render.
 */
function useViewMode() {
  const [mode, setMode] = useState<ViewMode>("list");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "cards" || saved === "list") setMode(saved);
    } catch {
      /* storage unavailable: the list it is */
    }
  }, []);
  function choose(next: ViewMode) {
    setMode(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* not persisted this time */
    }
  }
  return { mode, choose };
}

export default function DocumentsPage() {
  const { formatDate, formatBytes } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const docTypeLabel = useDocTypeLabel();
  const { practice, organizationId } = useOrg();
  const memberName = useMemberName();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [offset, setOffset] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { open, toggle } = useOpenGroups();
  const { mode, choose } = useViewMode();
  const [tagsFor, setTagsFor] = useState<CardDocument | null>(null);
  const [typeFor, setTypeFor] = useState<CardDocument | null>(null);
  const [manageTags, setManageTags] = useState(false);

  // Tags or type changed on the server: the rows, the counts and the tag
  // list all move, so both resources refetch.
  function changed() {
    list.reload();
    panel.reload();
  }

  // The search box filters server-side, so only the settled value reaches the
  // fetch; typing a file name otherwise fired a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Any change of filter starts the list from the top again.
  useEffect(() => setOffset(0), [filters, debouncedQuery]);

  // The panel's data changes only when documents do, so it is one resource
  // reloaded after an upload, separate from the list that refetches on every
  // filter change.
  const panel = useResource(
    async (api) => {
      const [matters, clients, tags, facets] = await Promise.all([
        api.matters.list(),
        api.clients.list(),
        api.documentTags.list(),
        api.documents.facets(),
      ]);
      return { matters, clients, tags, facets };
    },
    [],
  );

  const list = useResource(
    async (api) =>
      api.documents.list({
        q: debouncedQuery || undefined,
        matter_id: filters.matterId ?? undefined,
        client_id: filters.clientId ?? undefined,
        doc_type: filters.docType ?? undefined,
        tag_ids: filters.tagIds,
        unfiled: filters.view === "unfiled" || undefined,
        limit: filters.view === "recent" ? RECENT_LIMIT : PAGE_SIZE,
        offset,
      }),
    [debouncedQuery, filters, offset],
  );

  // Pages accumulate as "load more" is pressed; a filter change resets them.
  const [pages, setPages] = useState<MatterDocument[][]>([]);
  useEffect(() => {
    if (!list.data) return;
    setPages((current) => (offset === 0 ? [list.data!] : [...current.slice(0, offset / PAGE_SIZE), list.data!]));
  }, [list.data, offset]);
  const documents = useMemo(() => pages.flat(), [pages]);
  const lastPageFull =
    filters.view !== "recent" && (list.data?.length ?? 0) === PAGE_SIZE;

  const matters = panel.data?.matters ?? [];
  const clients = panel.data?.clients ?? [];
  const tags = panel.data?.tags ?? [];
  const facets = panel.data?.facets;
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  function set(change: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...change }));
  }
  function toggleTag(tagId: number) {
    setFilters((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((id) => id !== tagId)
        : [...current.tagIds, tagId],
    }));
  }

  const activeCount =
    (filters.view !== "all" ? 1 : 0) +
    (filters.matterId !== null ? 1 : 0) +
    (filters.clientId !== null ? 1 : 0) +
    (filters.docType !== null ? 1 : 0) +
    filters.tagIds.length;

  // --- the tree ---------------------------------------------------------

  const count = (n: number | undefined) => (n === undefined ? "" : ` (${n})`);

  const generalItems = [
    { id: "all", label: t("@legalos.documents.tree.all") + count(facets?.total), isSelected: filters.view === "all" && activeCount === 0, onClick: () => setFilters(NO_FILTERS) },
    { id: "recent", label: t("@legalos.documents.tree.recent"), isSelected: filters.view === "recent", onClick: () => set({ view: filters.view === "recent" ? "all" : "recent" }) },
    { id: "unfiled", label: t("@legalos.documents.tree.unfiled") + count(facets?.unfiled), isSelected: filters.view === "unfiled", onClick: () => set({ view: filters.view === "unfiled" ? "all" : "unfiled" }) },
  ];
  const matterItems = matters
    .map((matter) => ({ matter, n: facets?.by_matter[String(matter.id)] ?? 0 }))
    .filter((node) => node.n > 0)
    .map((node) => ({
      id: `m${node.matter.id}`,
      label: `${node.matter.name} (${node.n})`,
      startContent: <MatterTypeIcon type={node.matter.matter_type} />,
      isSelected: filters.matterId === node.matter.id,
      onClick: () => set({ matterId: filters.matterId === node.matter.id ? null : node.matter.id }),
    }));
  const clientItems = clients
    .map((client) => ({ client, n: facets?.by_client[String(client.id)] ?? 0 }))
    .filter((node) => node.n > 0)
    .map((node) => ({
      id: `c${node.client.id}`,
      label: `${node.client.name} (${node.n})`,
      isSelected: filters.clientId === node.client.id,
      onClick: () => set({ clientId: filters.clientId === node.client.id ? null : node.client.id }),
    }));
  const typeItems = DOC_TYPES.map((docType) => ({ docType, n: facets?.by_type[docType] ?? 0 }))
    .filter((node) => node.n > 0)
    .map((node) => ({
      id: `t${node.docType}`,
      label: `${docTypeLabel(node.docType)} (${node.n})`,
      isSelected: filters.docType === node.docType,
      onClick: () => set({ docType: filters.docType === node.docType ? null : node.docType }),
    }));
  const tagItems = tags
    .filter((tag) => tag.document_count > 0)
    .map((tag) => ({
      id: `g${tag.id}`,
      label: `${tag.name} (${tag.document_count})`,
      isSelected: filters.tagIds.includes(tag.id),
      onClick: () => toggleTag(tag.id),
    }));

  const groups: { key: Group; label: string; items: { id: string; label: string; startContent?: React.ReactNode; isSelected: boolean; onClick: () => void }[] }[] = [
    { key: "general", label: t("@legalos.documents.tree.group.general"), items: generalItems },
    { key: "matters", label: t("@legalos.documents.tree.group.matters"), items: matterItems },
    { key: "clients", label: t("@legalos.documents.tree.group.clients"), items: clientItems },
    { key: "types", label: t("@legalos.documents.tree.group.types"), items: typeItems },
    { key: "tags", label: t("@legalos.documents.tree.group.tags"), items: tagItems },
  ];

  // --- the chips ----------------------------------------------------------

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.view === "recent") chips.push({ key: "recent", label: t("@legalos.documents.tree.recent"), remove: () => set({ view: "all" }) });
  if (filters.view === "unfiled") chips.push({ key: "unfiled", label: t("@legalos.documents.tree.unfiled"), remove: () => set({ view: "all" }) });
  if (filters.matterId !== null) {
    const matter = matters.find((m) => m.id === filters.matterId);
    chips.push({ key: "matter", label: matter?.name ?? String(filters.matterId), remove: () => set({ matterId: null }) });
  }
  if (filters.clientId !== null) {
    const client = clients.find((c) => c.id === filters.clientId);
    chips.push({ key: "client", label: client?.name ?? String(filters.clientId), remove: () => set({ clientId: null }) });
  }
  if (filters.docType !== null) chips.push({ key: "type", label: docTypeLabel(filters.docType), remove: () => set({ docType: null }) });
  for (const tagId of filters.tagIds) {
    chips.push({ key: `tag${tagId}`, label: tagById.get(tagId)?.name ?? String(tagId), remove: () => toggleTag(tagId) });
  }

  // --- the rows -----------------------------------------------------------

  const rows = useMemo<DocRow[]>(
    () =>
      documents.map((doc: MatterDocument) => ({
        id: doc.id,
        name: doc.name,
        contentType: doc.content_type,
        docType: doc.doc_type,
        matterId: doc.matter_id,
        matterName: doc.matter_name,
        status: doc.status,
        size: doc.size_bytes,
        uploadedBy: memberName(doc.uploaded_by),
        uploadedAt: doc.uploaded_at,
        hasFile: doc.storage_key !== null,
        tagIds: doc.tag_ids,
      })),
    [documents, memberName],
  );

  async function upload(files: FileList | null) {
    if (!practice || !files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await practice.documents.upload(file, {
          matter_id: filters.matterId ?? undefined,
          doc_type: filters.docType ?? undefined,
        });
      }
      list.reload();
      panel.reload();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.documents.uploadError"));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const filtered = activeCount > 0 || Boolean(debouncedQuery);

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-64px)] w-full">
      {/* Side panel: The filter tree */}
      <aside
        className="w-full md:w-72 shrink-0 p-4 border-b md:border-b-0 md:border-inline-end overflow-y-auto"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const isOpen = open[group.key];
            return (
              <div key={group.key} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggle(group.key, !isOpen)}
                  className="flex items-center justify-between py-1.5 px-2 text-xs font-semibold rounded hover:bg-[var(--surface2)] transition-colors select-none"
                  style={{ color: "var(--text2)" }}
                  aria-expanded={isOpen}
                >
                  <span>{group.label}</span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-0.5 mt-1 ps-1">
                    {group.items.length > 0 ? (
                      group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="flex items-center justify-between w-full text-start py-1.5 px-2.5 rounded text-xs transition-colors"
                          style={{
                            backgroundColor: item.isSelected ? "var(--primary-soft)" : "transparent",
                            color: item.isSelected ? "var(--primary)" : "var(--text)",
                            fontWeight: item.isSelected ? 600 : 400,
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            {"startContent" in item && item.startContent}
                            <span className="truncate">{item.label}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <span className="text-xs px-2.5 py-1.5" style={{ color: "var(--text3)" }}>
                        {t("@legalos.documents.tree.groupEmpty")}
                      </span>
                    )}
                    {group.key === "tags" && (
                      <div className="mt-1 ps-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          startIcon={<TagIcon className="w-3.5 h-3.5" />}
                          onClick={() => setManageTags(true)}
                        >
                          {t("@legalos.documents.tags.manage")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.documents.heading")}
            </h1>
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t(
                filtered
                  ? "@legalos.documents.subtitle.filtered"
                  : "@legalos.documents.subtitle.firmWide",
                { count: filtered ? rows.length : (facets?.total ?? rows.length) },
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-64">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("@legalos.documents.search.placeholder")}
                aria-label={t("@legalos.documents.search.label")}
                startIcon={<MagnifyingGlassIcon className="w-4 h-4" style={{ color: "var(--text2)" }} />}
              />
            </div>

            <div
              className="flex items-center p-0.5 rounded border"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface2)",
                borderRadius: "var(--rs)",
              }}
              role="radiogroup"
              aria-label={t("@legalos.documents.view.label")}
            >
              <button
                type="button"
                onClick={() => choose("list")}
                className="p-1.5 rounded transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: mode === "list" ? "var(--surface)" : "transparent",
                  color: mode === "list" ? "var(--text)" : "var(--text2)",
                  boxShadow: mode === "list" ? "var(--shadow)" : "none",
                  borderRadius: "var(--rs)",
                }}
                title={t("@legalos.documents.view.list")}
                aria-label={t("@legalos.documents.view.list")}
                aria-checked={mode === "list"}
                role="radio"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => choose("cards")}
                className="p-1.5 rounded transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: mode === "cards" ? "var(--surface)" : "transparent",
                  color: mode === "cards" ? "var(--text)" : "var(--text2)",
                  boxShadow: mode === "cards" ? "var(--shadow)" : "none",
                  borderRadius: "var(--rs)",
                }}
                title={t("@legalos.documents.view.cards")}
                aria-label={t("@legalos.documents.view.cards")}
                aria-checked={mode === "cards"}
                role="radio"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="secondary"
              startIcon={<TagIcon className="w-4 h-4" />}
              onClick={() => setManageTags(true)}
            >
              {t("@legalos.documents.tags.manage")}
            </Button>

            <Button
              variant="primary"
              disabled={uploading || !practice}
              loading={uploading}
              startIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? t("@legalos.documents.uploading") : t("@legalos.documents.upload")}
            </Button>
          </div>
        </div>

        {/* Real file input */}
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(event) => upload(event.target.files)}
        />

        {chips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border"
                style={{
                  backgroundColor: "var(--surface2)",
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--rs)",
                }}
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.remove}
                  className="hover:opacity-75 focus:outline-none flex items-center justify-center"
                  style={{ color: "var(--text2)" }}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(NO_FILTERS)}
            >
              {t("@legalos.documents.filters.clearAll")}
            </Button>
          </div>
        )}

        <InlineError message={error} onDismiss={() => setError(null)} />

        <DataView resource={list} loadingLabel={t("@legalos.documents.loading")}>
          {() =>
            rows.length > 0 ? (
              <div className="flex flex-col gap-4">
                {mode === "cards" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {rows.map((row) => (
                      <DocumentCard
                        key={row.id}
                        doc={row}
                        tagById={tagById}
                        onEditTags={setTagsFor}
                        onChangeType={setTypeFor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--border)", borderRadius: "var(--r)" }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("@legalos.documents.field.document")}</TableHead>
                          <TableHead style={{ width: "130px" }}>{t("@legalos.documents.field.type")}</TableHead>
                          <TableHead>{t("@legalos.documents.field.matter")}</TableHead>
                          <TableHead>{t("@legalos.documents.field.uploadedBy")}</TableHead>
                          <TableHead style={{ width: "130px" }}>{t("@legalos.documents.field.uploaded")}</TableHead>
                          <TableHead style={{ width: "130px" }}>{t("@legalos.documents.field.status")}</TableHead>
                          <TableHead style={{ width: "110px", textAlign: "end" }}>{t("@legalos.documents.field.size")}</TableHead>
                          <TableHead style={{ width: "96px", textAlign: "end" }}><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const FileIconComp = fileIcon(row.contentType);
                          return (
                            <TableRow key={row.id}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <FileIconComp className="w-5 h-5 shrink-0" style={{ color: "var(--text2)" }} />
                                  <div className="flex flex-col min-w-0">
                                    <NextLink
                                      href={`/documents/${row.id}`}
                                      className="font-medium hover:underline truncate"
                                      style={{ color: "var(--text)" }}
                                    >
                                      {row.name}
                                    </NextLink>
                                    {row.tagIds.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap mt-1">
                                        {row.tagIds.map((tagId) => {
                                          const tag = tagById.get(tagId);
                                          return tag ? <TagToken key={tagId} tag={tag} /> : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell style={{ color: "var(--text2)" }}>
                                {docTypeLabel(row.docType)}
                              </TableCell>
                              <TableCell>
                                {row.matterId ? (
                                  <NextLink
                                    href={`/matters/${row.matterId}`}
                                    className="hover:underline truncate block"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    {row.matterName}
                                  </NextLink>
                                ) : (
                                  <span style={{ color: "var(--text2)" }}>
                                    {t("@legalos.documents.unfiled")}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                                    style={{
                                      backgroundColor: "var(--surface3)",
                                      color: "var(--text)",
                                    }}
                                  >
                                    {row.uploadedBy?.charAt(0) || "U"}
                                  </div>
                                  <span style={{ color: "var(--text2)" }}>{row.uploadedBy}</span>
                                </div>
                              </TableCell>
                              <TableCell style={{ color: "var(--text2)" }}>
                                {formatDate(row.uploadedAt)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="dot"
                                  color={STATUS_BADGE_COLOR[row.status] || "neutral"}
                                >
                                  {enumLabel(row.status)}
                                </Badge>
                              </TableCell>
                              <TableCell style={{ textAlign: "end" }}>
                                {row.hasFile ? (
                                  <a
                                    href={`${API_BASE}/api/orgs/${organizationId}/documents/${row.id}/content`}
                                    download
                                    className="hover:underline text-xs"
                                    style={{ color: "var(--primary)" }}
                                  >
                                    {formatBytes(row.size)}
                                  </a>
                                ) : (
                                  <span className="text-xs" style={{ color: "var(--text3)" }}>
                                    {t("@legalos.documents.noFile")}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell style={{ textAlign: "end" }}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title={t("@legalos.documents.tags.edit")}
                                    onClick={() => setTagsFor(row)}
                                  >
                                    <TagIcon className="w-4 h-4" />
                                    <span className="sr-only">{t("@legalos.documents.tags.edit")}</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title={t("@legalos.documents.type.change")}
                                    onClick={() => setTypeFor(row)}
                                  >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    <span className="sr-only">{t("@legalos.documents.type.change")}</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {lastPageFull && (
                  <div className="flex justify-center mt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                      {t("@legalos.documents.loadMore")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<DocumentIcon className="w-8 h-8" style={{ color: "var(--text2)" }} />}
                title={
                  filtered
                    ? t("@legalos.documents.empty.noMatchTitle")
                    : t("@legalos.documents.empty.noneTitle")
                }
                description={
                  filtered
                    ? t("@legalos.documents.empty.filteredDescription")
                    : t("@legalos.documents.empty.noneDescription")
                }
                action={
                  filtered ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setFilters(NO_FILTERS);
                        setQuery("");
                      }}
                    >
                      {t("@legalos.documents.filters.clearAll")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => fileInput.current?.click()}
                    >
                      {t("@legalos.documents.empty.uploadAction")}
                    </Button>
                  )
                }
              />
            )
          }
        </DataView>

        {tagsFor && (
          <TagsDialog
            isOpen
            onOpenChange={(open) => !open && setTagsFor(null)}
            documentId={tagsFor.id}
            documentName={tagsFor.name}
            tags={tags}
            selected={tagsFor.tagIds}
            onSaved={changed}
          />
        )}
        {typeFor && (
          <DocTypeDialog
            isOpen
            onOpenChange={(open) => !open && setTypeFor(null)}
            documentId={typeFor.id}
            documentName={typeFor.name}
            current={typeFor.docType}
            onSaved={changed}
          />
        )}
        <ManageTagsDialog
          isOpen={manageTags}
          onOpenChange={setManageTags}
          tags={tags}
          onChanged={changed}
        />
      </main>
    </div>
  );
}
