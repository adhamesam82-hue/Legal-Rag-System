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
 * Deliberately absent: favourites, archive, deleted. There is no backend for
 * any of them (no column, no soft delete), and a "Deleted" folder that is
 * empty forever tells a lawyer a deleted file can be recovered when it cannot.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TreeList } from "@astryxdesign/core/TreeList";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Token } from "@astryxdesign/core/Token";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import {
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  TableCellsIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  DOC_TYPES,
  type DocumentStatus,
  type DocumentTag,
  type MatterDocument,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useDocTypeLabel, useEnumLabel } from "@/lib/i18n/enum-label";

const STATUS_VARIANT: Record<
  DocumentStatus,
  "neutral" | "warning" | "accent" | "success"
> = {
  draft: "neutral",
  under_review: "warning",
  signed: "success",
  filed: "accent",
  final: "success",
};

/** The file's format decides the icon; doc_type is what the file IS. */
function fileIcon(contentType: string) {
  if (contentType === "application/pdf") return DocumentTextIcon;
  if (contentType.includes("spreadsheet") || contentType === "text/csv") return TableCellsIcon;
  if (contentType.startsWith("image/")) return PhotoIcon;
  return DocumentIcon;
}

/** The general views: one list, three ways in. */
type View = "all" | "recent" | "unfiled";

const RECENT_LIMIT = 20;
const PAGE_SIZE = 100;
const OPEN_GROUPS_KEY = "legalos-documents-tree-open";
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

  const groups: { key: Group; label: string; items: typeof generalItems }[] = [
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
        // Filed where the lawyer is looking: the selected matter, and the
        // selected type if one is active.
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

  const columns: TableColumn<DocRow>[] = [
    {
      key: "name",
      header: t("@legalos.documents.field.document"),
      width: proportional(3),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Icon icon={fileIcon(row.contentType)} size="sm" color="secondary" />
          <VStack gap={0}>
            <Link href={`/documents/${row.id}`}>
              <Text type="body" weight="semibold" maxLines={1}>
                {row.name}
              </Text>
            </Link>
            {row.tagIds.length > 0 && (
              <HStack gap={1} wrap="wrap">
                {row.tagIds.map((tagId) => {
                  const tag = tagById.get(tagId);
                  return tag ? (
                    <Token key={tagId} label={tag.name} size="sm" color={tag.color as DocumentTag["color"]} />
                  ) : null;
                })}
              </HStack>
            )}
          </VStack>
        </HStack>
      ),
    },
    {
      key: "docType",
      header: t("@legalos.documents.field.type"),
      width: pixel(120),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {docTypeLabel(row.docType)}
        </Text>
      ),
    },
    {
      key: "matterName",
      header: t("@legalos.documents.field.matter"),
      width: proportional(2),
      renderCell: (row) =>
        row.matterId ? (
          <Link href={`/matters/${row.matterId}`}>
            <Text type="body" color="secondary" maxLines={1}>
              {row.matterName}
            </Text>
          </Link>
        ) : (
          <Text type="body" color="secondary">
            {t("@legalos.documents.unfiled")}
          </Text>
        ),
    },
    {
      key: "uploadedBy",
      header: t("@legalos.documents.field.uploadedBy"),
      width: proportional(1.5),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Avatar name={row.uploadedBy} size="sm" tooltip={false} />
          <Text type="body" color="secondary">
            {row.uploadedBy}
          </Text>
        </HStack>
      ),
    },
    {
      key: "uploadedAt",
      header: t("@legalos.documents.field.uploaded"),
      width: pixel(130),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {formatDate(row.uploadedAt)}
        </Text>
      ),
    },
    {
      key: "status",
      header: t("@legalos.documents.field.status"),
      width: pixel(130),
      renderCell: (row) => (
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={STATUS_VARIANT[row.status]} label={enumLabel(row.status)} />
          <Text type="body" color="secondary">
            {enumLabel(row.status)}
          </Text>
        </HStack>
      ),
    },
    {
      key: "size",
      header: t("@legalos.documents.field.size"),
      width: pixel(120),
      align: "end",
      renderCell: (row) =>
        row.hasFile ? (
          <Link href={`${API_BASE}/api/orgs/${organizationId}/documents/${row.id}/content`}>
            {formatBytes(row.size)}
          </Link>
        ) : (
          <Text type="supporting" color="secondary">
            {t("@legalos.documents.noFile")}
          </Text>
        ),
    },
  ];

  const filtered = activeCount > 0 || Boolean(debouncedQuery);

  return (
    <Layout
      height="fill"
      start={
        <LayoutPanel width={280} hasDivider>
          <VStack gap={3}>
            {groups.map((group) => (
              <Collapsible
                key={group.key}
                value={group.key}
                isOpen={open[group.key]}
                onOpenChange={(isOpen) => toggle(group.key, isOpen)}
                trigger={
                  <Text type="label" color="secondary">
                    {group.label}
                  </Text>
                }
              >
                {group.items.length > 0 ? (
                  <TreeList items={group.items} density="compact" />
                ) : (
                  <Text type="supporting" color="secondary">
                    {t("@legalos.documents.tree.groupEmpty")}
                  </Text>
                )}
              </Collapsible>
            ))}
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={0}>
          <VStack gap={5}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
              <VStack gap={1}>
                <Heading level={2}>{t("@legalos.documents.heading")}</Heading>
                <Text type="body" color="secondary">
                  {t(
                    filtered
                      ? "@legalos.documents.subtitle.filtered"
                      : "@legalos.documents.subtitle.firmWide",
                    { count: filtered ? rows.length : (facets?.total ?? rows.length) },
                  )}
                </Text>
              </VStack>
              <HStack gap={3}>
                <TextInput
                  label={t("@legalos.documents.search.label")}
                  isLabelHidden
                  value={query}
                  onChange={setQuery}
                  placeholder={t("@legalos.documents.search.placeholder")}
                  startIcon={MagnifyingGlassIcon}
                  width={280}
                />
                <Button
                  label={uploading ? t("@legalos.documents.uploading") : t("@legalos.documents.upload")}
                  variant="primary"
                  isDisabled={uploading || !practice}
                  icon={<Icon icon={ArrowUpTrayIcon} size="sm" color="inherit" />}
                  onClick={() => fileInput.current?.click()}
                />
              </HStack>
            </HStack>

            {/* The real file picker; the Astryx Button above drives it. */}
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(event) => upload(event.target.files)}
            />

            {chips.length > 0 && (
              <HStack gap={2} vAlign="center" wrap="wrap">
                {chips.map((chip) => (
                  <Token key={chip.key} label={chip.label} onRemove={chip.remove} />
                ))}
                <Button
                  label={t("@legalos.documents.filters.clearAll")}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(NO_FILTERS)}
                />
              </HStack>
            )}

            <InlineError message={error} onDismiss={() => setError(null)} />

            <DataView resource={list} loadingLabel={t("@legalos.documents.loading")}>
              {() =>
                rows.length > 0 ? (
                  <VStack gap={3}>
                    <Table<DocRow> data={rows} columns={columns} idKey="id" hasHover />
                    {lastPageFull && (
                      <HStack hAlign="center">
                        <Button
                          label={t("@legalos.documents.loadMore")}
                          variant="secondary"
                          onClick={() => setOffset(offset + PAGE_SIZE)}
                        />
                      </HStack>
                    )}
                  </VStack>
                ) : (
                  <EmptyState
                    icon={<Icon icon={DocumentIcon} size="lg" color="secondary" />}
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
                    actions={
                      filtered ? (
                        <Button
                          label={t("@legalos.documents.filters.clearAll")}
                          variant="secondary"
                          onClick={() => {
                            setFilters(NO_FILTERS);
                            setQuery("");
                          }}
                        />
                      ) : (
                        <Button
                          label={t("@legalos.documents.empty.uploadAction")}
                          variant="secondary"
                          onClick={() => fileInput.current?.click()}
                        />
                      )
                    }
                  />
                )
              }
            </DataView>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
