"use client";

import { useMemo, useRef, useState } from "react";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TreeList } from "@astryxdesign/core/TreeList";
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
  formatBytes,
  formatDate,
  type DocumentStatus,
  type MatterDocument,
} from "@/lib/practice";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";

// OCR state, sharing scope, comment threads and document tags were part of the
// UI concept but have no backend, so they are not rendered here. What is shown
// is what the documents table actually stores.

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

function fileIcon(docType: string) {
  const kind = docType.toLowerCase();
  if (kind.includes("pdf")) return DocumentTextIcon;
  if (kind.includes("xls") || kind.includes("csv")) return TableCellsIcon;
  if (kind.includes("png") || kind.includes("jpg") || kind.includes("image")) {
    return PhotoIcon;
  }
  return DocumentIcon;
}

interface DocRow extends Record<string, unknown> {
  id: number;
  name: string;
  docType: string;
  matterId: number | null;
  matterName: string | null;
  status: DocumentStatus;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  hasFile: boolean;
}

export default function DocumentsPage() {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice, organizationId } = useOrg();
  const memberName = useMemberName();
  const [query, setQuery] = useState("");
  const [selectedMatter, setSelectedMatter] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const resource = useResource(
    async (api) => {
      const [documents, matters] = await Promise.all([
        api.documents.list({ q: query.trim() || undefined }),
        api.matters.list(),
      ]);
      return { documents, matters };
    },
    [query],
  );

  const documents = resource.data?.documents ?? [];
  const matters = resource.data?.matters ?? [];

  // The folder tree is the matter list: documents are filed against matters,
  // so that is the real hierarchy rather than an invented folder structure.
  const treeItems = useMemo(
    () => [
      {
        id: "all",
        label: t("@legalos.documents.tree.allDocuments", { count: documents.length }),
        isSelected: selectedMatter === null,
        onClick: () => setSelectedMatter(null),
      },
      ...matters
        .map((matter) => ({
          matter,
          count: documents.filter((d) => d.matter_id === matter.id).length,
        }))
        .filter((node) => node.count > 0)
        .map((node) => ({
          id: String(node.matter.id),
          label: `${node.matter.name} (${node.count})`,
          isSelected: selectedMatter === String(node.matter.id),
          onClick: () => setSelectedMatter(String(node.matter.id)),
        })),
    ],
    [matters, documents, selectedMatter],
  );

  const rows = useMemo<DocRow[]>(
    () =>
      documents
        .filter(
          (doc) =>
            !selectedMatter || String(doc.matter_id ?? "") === selectedMatter,
        )
        .map((doc: MatterDocument) => ({
          id: doc.id,
          name: doc.name,
          docType: doc.doc_type,
          matterId: doc.matter_id,
          matterName: doc.matter_name,
          status: doc.status,
          size: doc.size_bytes,
          uploadedBy: memberName(doc.uploaded_by),
          uploadedAt: doc.uploaded_at,
          hasFile: doc.storage_key !== null,
        })),
    [documents, selectedMatter, memberName],
  );

  async function upload(files: FileList | null) {
    if (!practice || !files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await practice.documents.upload(file, {
          matter_id: selectedMatter ? Number(selectedMatter) : undefined,
        });
      }
      resource.reload();
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
          <Icon icon={fileIcon(row.docType)} size="sm" color="secondary" />
          <Link href={`/documents/${row.id}`}>
            <Text type="body" weight="semibold" maxLines={1}>
              {row.name}
            </Text>
          </Link>
        </HStack>
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
          <Link
            href={`${API_BASE}/api/orgs/${organizationId}/documents/${row.id}/content`}
          >
            {formatBytes(row.size)}
          </Link>
        ) : (
          <Text type="supporting" color="secondary">
            {t("@legalos.documents.noFile")}
          </Text>
        ),
    },
  ];

  return (
    <Layout
      height="fill"
      start={
        <LayoutPanel width={260} hasDivider>
          <VStack gap={4}>
            <Text type="label" color="secondary">
              {t("@legalos.documents.panel.matters")}
            </Text>
            <TreeList items={treeItems} density="compact" />
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
                    selectedMatter
                      ? "@legalos.documents.subtitle.inMatter"
                      : "@legalos.documents.subtitle.firmWide",
                    { count: rows.length },
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
                >
                  {uploading ? t("@legalos.documents.uploading") : t("@legalos.documents.upload")}
                </Button>
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

            <InlineError message={error} onDismiss={() => setError(null)} />

            <DataView resource={resource} loadingLabel={t("@legalos.documents.loading")}>
              {() =>
                rows.length > 0 ? (
                  <Table<DocRow> data={rows} columns={columns} idKey="id" hasHover />
                ) : (
                  <EmptyState
                    icon={<Icon icon={DocumentIcon} size="lg" color="secondary" />}
                    title={
                      query
                        ? t("@legalos.documents.empty.noMatchTitle")
                        : t("@legalos.documents.empty.noneTitle")
                    }
                    description={
                      query
                        ? t("@legalos.documents.empty.noMatchDescription")
                        : t("@legalos.documents.empty.noneDescription")
                    }
                    actions={
                      <Button
                        label={t("@legalos.documents.empty.uploadAction")}
                        variant="secondary"
                        onClick={() => fileInput.current?.click()}
                      />
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
