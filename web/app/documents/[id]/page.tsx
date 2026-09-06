"use client";

/**
 * Document detail page (T-053 / Wave 5).
 *
 * Shows full document metadata, download link, tag editing via TagsDialog,
 * type editing via DocTypeDialog, status selector, and delete action.
 * Preserves all hooks, contract layer calls, and state intact.
 */

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { API_BASE } from "@/lib/api";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { type DocumentStatus } from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useDocTypeLabel, useEnumLabel } from "@/lib/i18n/enum-label";
import { TagsDialog, TagToken } from "@/components/documents/TagsDialog";
import { DocTypeDialog } from "@/components/documents/DocTypeDialog";

const STATUSES: DocumentStatus[] = [
  "draft",
  "under_review",
  "signed",
  "filed",
  "final",
];

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { formatDateTime, formatBytes } = useFormat();
  const { id } = use(params);
  const t = useTranslator();
  const documentId = Number(id);
  const enumLabel = useEnumLabel();
  const docTypeLabel = useDocTypeLabel();
  const router = useRouter();
  const { practice, organizationId } = useOrg();
  const memberName = useMemberName();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const resource = useResource(
    (api) => api.documents.get(documentId),
    [documentId],
  );
  // The firm's tags, to show this document's by name and colour.
  const tagList = useResource((api) => api.documentTags.list(), []);
  const tags = tagList.data ?? [];
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  async function setStatus(status: string | null) {
    if (!practice || !status) return;
    setPending(true);
    setError(null);
    try {
      await practice.documents.update(documentId, { status });
      resource.reload();
    } catch (exc) {
      setError(
        exc instanceof Error ? exc.message : t("@legalos.documents.detail.updateError"),
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!practice) return;
    setPending(true);
    setError(null);
    try {
      await practice.documents.remove(documentId);
      router.push("/documents");
    } catch (exc) {
      setError(
        exc instanceof Error ? exc.message : t("@legalos.documents.detail.deleteError"),
      );
      setPending(false);
    }
  }

  return (
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      <DataView resource={resource} loadingLabel={t("@legalos.documents.detail.loading")}>
        {(doc) => (
          <div className="flex flex-col gap-6">
            {/* Back link */}
            <div>
              <Link
                href="/documents"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: "var(--text2)" }}
              >
                <Icon name="arrow_back" size={18} />
                <span>{t("@legalos.documents.detail.backLink")}</span>
              </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--surface2)", color: "var(--primary)" }}
                  >
                    <Icon name="description" size={22} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                    {doc.name}
                  </h1>
                </div>
                <p className="text-sm" style={{ color: "var(--text2)" }}>
                  {doc.matter_id ? (
                    <Link
                      href={`/matters/${doc.matter_id}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--primary)" }}
                    >
                      {doc.matter_name}
                    </Link>
                  ) : (
                    t("@legalos.documents.detail.notFiled")
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div style={{ width: "160px" }}>
                  <Select
                    value={doc.status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={pending}
                    options={STATUSES.map((s) => ({ value: s, label: enumLabel(s) }))}
                  />
                </div>

                {doc.storage_key && (
                  <a
                    href={`${API_BASE}/api/orgs/${organizationId}/documents/${doc.id}/content`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface)",
                      color: "var(--text)",
                    }}
                  >
                    <Icon name="download" size={16} />
                    <span>{t("@legalos.documents.detail.download")}</span>
                  </a>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={remove}
                >
                  <Icon name="delete" size={16} />
                  <span>{t("@legalos.documents.detail.delete")}</span>
                </Button>
              </div>
            </div>

            <InlineError message={error} onDismiss={() => setError(null)} />

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 columns: Stored File & Tags */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* File preview/status */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.documents.detail.fileHeading")}
                  </h2>
                  {doc.storage_key ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm" style={{ color: "var(--text2)" }}>
                        {doc.content_type} · {formatBytes(doc.size_bytes)}
                      </p>
                      <div>
                        <a
                          href={`${API_BASE}/api/orgs/${organizationId}/documents/${doc.id}/content`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline inline-flex items-center gap-1.5"
                          style={{ color: "var(--primary)" }}
                        >
                          <Icon name="open_in_new" size={16} />
                          <span>{t("@legalos.documents.detail.openStoredFile")}</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Icon name="draft" size={32} />}
                      title={t("@legalos.documents.detail.noFileTitle")}
                      description={t("@legalos.documents.detail.noFileDescription")}
                    />
                  )}
                </Card>

                {/* Tags */}
                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.documents.detail.tagsHeading")}
                    </h2>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => setTagsOpen(true)}
                    >
                      {t("@legalos.documents.detail.editTags")}
                    </Button>
                  </div>
                  {doc.tag_ids.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text2)" }}>
                      {t("@legalos.documents.detail.noTags")}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.tag_ids.map((id) => {
                        const tag = tagById.get(id);
                        return tag ? <TagToken key={id} tag={tag} size="md" /> : null;
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* Right column: Document Details */}
              <div className="flex flex-col gap-6">
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.documents.detail.detailsHeading")}
                  </h2>
                  <dl className="flex flex-col gap-2.5 text-sm">
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.documents.field.status")}</dt>
                      <dd>
                        <Badge color="neutral">{enumLabel(doc.status)}</Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.documents.field.type")}</dt>
                      <dd className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: "var(--text)" }}>
                          {docTypeLabel(doc.doc_type)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => setTypeOpen(true)}
                        >
                          {t("@legalos.documents.type.change")}
                        </Button>
                      </dd>
                    </div>
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.documents.field.size")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>
                        {doc.storage_key && doc.size_bytes ? formatBytes(doc.size_bytes) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.documents.field.uploadedBy")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>{memberName(doc.uploaded_by)}</dd>
                    </div>
                    <div className="flex justify-between py-1" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.documents.field.uploaded")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>{formatDateTime(doc.uploaded_at)}</dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </div>

            {/* Dialogs */}
            <TagsDialog
              isOpen={tagsOpen}
              onOpenChange={setTagsOpen}
              documentId={doc.id}
              documentName={doc.name}
              tags={tags}
              selected={doc.tag_ids}
              onSaved={() => {
                resource.reload();
                tagList.reload();
              }}
            />
            <DocTypeDialog
              isOpen={typeOpen}
              onOpenChange={setTypeOpen}
              documentId={doc.id}
              documentName={doc.name}
              current={doc.doc_type}
              onSaved={resource.reload}
            />
          </div>
        )}
      </DataView>
    </div>
  );
}
