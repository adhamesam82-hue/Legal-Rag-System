"use client";

/**
 * Case detail page (T-053 / Wave 5).
 *
 * Shows full case record: court info, timeline, evidence, court documents,
 * related sub-cases, next hearing, deadlines, and AI summary.
 * Preserves all hooks, contract layer calls, and state intact.
 */

import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator, useDirection, type TranslatorFn } from "@astryxdesign/core/i18n";
import { useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import { daysUntil } from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { enumLabelWith } from "@/lib/i18n/enum-label";
import { CaseRefItem, ParentLine, PrimaryBadge } from "@/components/matter/SubCases";

function statusVariant(status: string): "success" | "warn" | "neutral" {
  if (status.startsWith("Active")) return "success";
  if (status.startsWith("On Hold")) return "warn";
  return "neutral";
}

const SUBMITTED_BY_KEYS: Record<string, string> = {
  us: "@legalos.cases.detail.submittedBy.us",
  opposing_party: "@legalos.cases.detail.submittedBy.opposingParty",
  court: "@legalos.cases.detail.submittedBy.court",
};

function submittedByLabel(t: TranslatorFn, value: string | null | undefined): string {
  if (!value) return "—";
  const key = SUBMITTED_BY_KEYS[value];
  return key ? t(key) : enumLabelWith(t, value);
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { formatDate } = useFormat();
  const { id } = use(params);
  const caseId = Number(id);
  const t = useTranslator();
  const direction = useDirection();

  const resource = useResource((api) => api.cases.get(caseId), [caseId]);

  return (
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      <DataView resource={resource} loadingLabel={t("@legalos.cases.detail.loading")}>
        {(record) => (
          <div className="flex flex-col gap-6">
            {/* Back link */}
            <div>
              <Link
                href={`/matters/${record.matter_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: "var(--text2)" }}
              >
                <Icon name={direction === "rtl" ? "arrow_forward" : "arrow_back"} size={18} />
                <span>{t("@legalos.cases.detail.backLink")}</span>
              </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-1 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  {record.case_number || t("@legalos.cases.detail.unfiledHeading")}
                </h1>
                {record.status && (
                  <Badge color={statusVariant(record.status)}>
                    {record.status}
                  </Badge>
                )}
                <PrimaryBadge record={record} />
              </div>
              <div className="text-sm" style={{ color: "var(--text2)" }}>
                <Link
                  href={`/matters/${record.matter_id}`}
                  className="font-medium hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {record.matter_name}
                </Link>
                {record.court ? ` · ${record.court}` : ""}
              </div>
              <ParentLine record={record} />
            </div>

            {/* AI summary */}
            {record.ai_summary && (
              <Card className="p-4 flex flex-col gap-2" style={{ backgroundColor: "var(--surface2)" }}>
                <div className="flex items-center gap-2">
                  <Icon name="auto_awesome" size={20} style={{ color: "var(--primary)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.summaryHeading")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                  {record.ai_summary}
                </p>
                <span className="text-xs" style={{ color: "var(--text3)" }}>
                  {t("@legalos.cases.detail.summaryDisclaimer")}
                </span>
              </Card>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 columns: Timeline, Evidence, Court documents */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Timeline */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.timelineHeading")}
                  </h2>
                  {record.timeline.length === 0 ? (
                    <p className="text-sm py-4" style={{ color: "var(--text2)" }}>
                      {t("@legalos.cases.detail.timelineEmpty")}
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                      {record.timeline.map((event) => (
                        <div key={event.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
                            >
                              <Icon name="flag" size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                                {event.label}
                              </span>
                              {event.detail && (
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {event.detail}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                            {formatDate(event.event_date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Evidence */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.evidenceHeading")}
                  </h2>
                  {record.evidence.length === 0 ? (
                    <p className="text-sm py-4" style={{ color: "var(--text2)" }}>
                      No evidence filed yet.
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                      {record.evidence.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
                            >
                              <Icon name="description" size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                                {item.name}
                              </span>
                              {item.evidence_type && (
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {item.evidence_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge color="neutral">
                              {submittedByLabel(t, item.submitted_by)}
                            </Badge>
                            <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                              {formatDate(item.submitted_date)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Court documents */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.courtDocumentsHeading")}
                  </h2>
                  {record.court_documents.length === 0 ? (
                    <p className="text-sm py-4" style={{ color: "var(--text2)" }}>
                      No court documents recorded.
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                      {record.court_documents.map((doc) => (
                        <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
                            >
                              <Icon name="gavel" size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                                {doc.name}
                              </span>
                              {doc.doc_type && (
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {doc.doc_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                            {formatDate(doc.doc_date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Right column: Details, Related cases, Next hearing, Deadlines */}
              <div className="flex flex-col gap-6">
                {/* Court Details */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.detailsHeading")}
                  </h2>
                  <dl className="flex flex-col gap-2.5 text-sm">
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.cases.field.court")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>{record.court || "—"}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.cases.field.judge")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>{record.judge || "—"}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.cases.field.filed")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>
                        {record.filed_date ? formatDate(record.filed_date) : t("@legalos.cases.field.notFiled")}
                      </dd>
                    </div>
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                      <dt style={{ color: "var(--text2)" }}>{t("@legalos.cases.field.opposingParty")}</dt>
                      <dd className="font-medium" style={{ color: "var(--text)" }}>{record.opposing_party || "—"}</dd>
                    </div>
                    {record.opposing_counsel && (
                      <div className="flex justify-between py-1" style={{ borderColor: "var(--border)" }}>
                        <dt style={{ color: "var(--text2)" }}>{t("@legalos.cases.field.opposingCounsel")}</dt>
                        <dd className="font-medium" style={{ color: "var(--text)" }}>{record.opposing_counsel}</dd>
                      </div>
                    )}
                  </dl>
                </Card>

                {/* Related cases */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.related.heading")}
                  </h2>
                  {record.parent ? (
                    <p className="text-sm" style={{ color: "var(--text2)" }}>
                      {t("@legalos.cases.related.childCannotParent")}
                    </p>
                  ) : record.children.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text2)" }}>
                      {t("@legalos.cases.related.empty")}
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                      {record.children.map((child) => (
                        <CaseRefItem key={child.id} ref={child} />
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/matters/${record.matter_id}`}
                    className="text-xs font-medium hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {t("@legalos.cases.related.manageOnMatter")}
                  </Link>
                </Card>

                {/* Next hearing */}
                <Card className="p-5 flex flex-col gap-3">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.nextHearingHeading")}
                  </h2>
                  {record.next_hearing ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Icon name="gavel" size={18} style={{ color: "var(--primary)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {formatDate(record.next_hearing.hearing_date)}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: "var(--text2)" }}>
                        {record.next_hearing.hearing_time}
                        {record.next_hearing.purpose ? ` · ${record.next_hearing.purpose}` : ""}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text2)" }}>
                      None scheduled.
                    </p>
                  )}
                </Card>

                {/* Deadlines */}
                <Card className="p-5 flex flex-col gap-4">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.cases.detail.deadlinesHeading")}
                  </h2>
                  {record.deadlines.length === 0 ? (
                    <EmptyState
                      icon={<Icon name="schedule" size={32} />}
                      title={t("@legalos.cases.detail.deadlinesEmptyTitle")}
                      description={t("@legalos.cases.detail.deadlinesEmptyDescription")}
                    />
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                      {record.deadlines.map((deadline) => {
                        const days = daysUntil(deadline.due_date);
                        return (
                          <div key={deadline.id} className="py-2.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Icon name="schedule" size={18} style={{ color: "var(--text2)" }} />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                                  {deadline.label}
                                </span>
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {formatDate(deadline.due_date)}
                                </span>
                              </div>
                            </div>
                            <div>
                              {deadline.completed ? (
                                <Badge color="success">
                                  {t("@legalos.cases.detail.deadlineDone")}
                                </Badge>
                              ) : days <= 3 ? (
                                <Badge color={days < 0 ? "danger" : "warn"}>
                                  {t("@legalos.cases.detail.daysSuffix", { days })}
                                </Badge>
                              ) : (
                                <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                                  {days}d
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}
      </DataView>
    </div>
  );
}
