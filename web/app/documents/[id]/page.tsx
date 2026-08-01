"use client";

import { use, useState } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  formatBytes,
  formatDateTime,
  type DocumentStatus,
} from "@/lib/practice";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";

// Version history and comment threads were in the UI concept but have no
// backend; this page shows the document's real stored state and the actions
// the API actually supports.

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
  const { id } = use(params);
  const t = useTranslator();
  const documentId = Number(id);
  const enumLabel = useEnumLabel();
  const router = useRouter();
  const { practice, organizationId } = useOrg();
  const memberName = useMemberName();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resource = useResource(
    (api) => api.documents.get(documentId),
    [documentId],
  );

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
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <DataView resource={resource} loadingLabel={t("@legalos.documents.detail.loading")}>
            {(doc) => (
              <VStack gap={6}>
                <Link href="/documents">
                  <HStack gap={1.5} vAlign="center">
                    <Icon icon={ArrowLeftIcon} size="sm" color="secondary" />
                    <Text type="body" color="secondary">
                      {t("@legalos.documents.detail.backLink")}
                    </Text>
                  </HStack>
                </Link>

                <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                  <VStack gap={1}>
                    <HStack gap={3} vAlign="center">
                      <Icon icon={DocumentIcon} size="md" color="secondary" />
                      <Heading level={2}>{doc.name}</Heading>
                    </HStack>
                    <Text type="body" color="secondary">
                      {doc.matter_id ? (
                        <Link href={`/matters/${doc.matter_id}`}>
                          {doc.matter_name}
                        </Link>
                      ) : (
                        t("@legalos.documents.detail.notFiled")
                      )}
                    </Text>
                  </VStack>
                  <HStack gap={3} vAlign="center">
                    <Selector
                      label={t("@legalos.documents.field.status")}
                      isLabelHidden
                      value={doc.status}
                      onChange={setStatus}
                      isDisabled={pending}
                      width={180}
                      options={STATUSES.map((s) => ({ value: s, label: enumLabel(s) }))}
                    />
                    {doc.storage_key && (
                      <Button
                        label={t("@legalos.documents.detail.download")}
                        variant="primary"
                        href={`${API_BASE}/api/orgs/${organizationId}/documents/${doc.id}/content`}
                        icon={
                          <Icon icon={ArrowDownTrayIcon} size="sm" color="inherit" />
                        }
                      >
                        {t("@legalos.documents.detail.download")}
                      </Button>
                    )}
                    <Button
                      label={t("@legalos.documents.detail.deleteDocument")}
                      variant="destructive"
                      isDisabled={pending}
                      icon={<Icon icon={TrashIcon} size="sm" color="inherit" />}
                      onClick={remove}
                    >
                      {t("@legalos.documents.detail.delete")}
                    </Button>
                  </HStack>
                </HStack>

                <InlineError message={error} onDismiss={() => setError(null)} />

                <Grid columns={3} gap={6}>
                  <GridSpan columns={2}>
                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>{t("@legalos.documents.detail.fileHeading")}</Heading>
                        {doc.storage_key ? (
                          <VStack gap={3}>
                            <Text type="body" color="secondary">
                              {doc.content_type} · {formatBytes(doc.size_bytes)}
                            </Text>
                            <Link
                              href={`${API_BASE}/api/orgs/${organizationId}/documents/${doc.id}/content`}
                            >
                              {t("@legalos.documents.detail.openStoredFile")}
                            </Link>
                          </VStack>
                        ) : (
                          <EmptyState
                            icon={
                              <Icon icon={DocumentIcon} size="lg" color="secondary" />
                            }
                            title={t("@legalos.documents.detail.noFileTitle")}
                            description={t("@legalos.documents.detail.noFileDescription")}
                          />
                        )}
                      </VStack>
                    </Card>
                  </GridSpan>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>{t("@legalos.documents.detail.detailsHeading")}</Heading>
                      <MetadataList>
                        <MetadataListItem label={t("@legalos.documents.field.status")}>
                          <Badge variant="neutral" label={enumLabel(doc.status)} />
                        </MetadataListItem>
                        <MetadataListItem label={t("@legalos.documents.field.type")}>
                          {doc.doc_type || "—"}
                        </MetadataListItem>
                        <MetadataListItem label={t("@legalos.documents.field.size")}>
                          {doc.size_bytes ? formatBytes(doc.size_bytes) : "—"}
                        </MetadataListItem>
                        <MetadataListItem label={t("@legalos.documents.field.uploadedBy")}>
                          {memberName(doc.uploaded_by)}
                        </MetadataListItem>
                        <MetadataListItem label={t("@legalos.documents.field.uploaded")}>
                          {formatDateTime(doc.uploaded_at)}
                        </MetadataListItem>
                      </MetadataList>
                    </VStack>
                  </Card>
                </Grid>
              </VStack>
            )}
          </DataView>
        </LayoutContent>
      }
    />
  );
}
