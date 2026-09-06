"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  getLead,
  STAGE_META,
  type TimelineEntryType,
  type ConsultationInfo,
} from "../data";
import { useFormat } from "@/lib/i18n/format";

const TIMELINE_ICON_NAME: Record<TimelineEntryType, string> = {
  call: "call",
  email: "mail",
  whatsapp: "chat",
  meeting: "group",
  note: "edit",
  stage: "flag",
};

const TIMELINE_LABEL_KEY: Record<TimelineEntryType, string> = {
  call: "@legalos.crm.timeline.call",
  email: "@legalos.crm.timeline.email",
  whatsapp: "@legalos.crm.timeline.whatsapp",
  meeting: "@legalos.crm.timeline.meeting",
  note: "@legalos.crm.timeline.note",
  stage: "@legalos.crm.timeline.stage",
};

const CONFLICT_META = {
  clear: { color: "neutral" as const, labelKey: "@legalos.crm.conflict.clear" },
  pending: { color: "warn" as const, labelKey: "@legalos.crm.conflict.pending" },
  flagged: { color: "danger" as const, labelKey: "@legalos.crm.conflict.flagged" },
};

export default function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslator();
  const { formatEGP, intlLocale } = useFormat();
  const { id } = use(params);
  const lead = getLead(id);

  const [notes, setNotes] = useState<string[]>(lead?.notes ?? []);
  const [draftNote, setDraftNote] = useState("");
  const [consultation, setConsultation] = useState<ConsultationInfo>(
    lead?.consultation ?? { status: "none" }
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleValue, setScheduleValue] = useState<string | undefined>(undefined);

  if (!lead) {
    return (
      <div className="p-8 flex items-center justify-center">
        <EmptyState
          title={t("@legalos.crm.detail.notFoundTitle")}
          description={t("@legalos.crm.detail.notFoundDescription")}
          action={
            <Link
              href="/crm"
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--primary)" }}
            >
              {t("@legalos.crm.detail.backToPipeline")}
            </Link>
          }
        />
      </div>
    );
  }

  const stageMeta = STAGE_META[lead.stage];
  const conflictMeta = CONFLICT_META[lead.conflictStatus];

  function addNote() {
    const trimmed = draftNote.trim();
    if (!trimmed) return;
    setNotes((prev) => [trimmed, ...prev]);
    setDraftNote("");
  }

  function confirmSchedule() {
    if (!scheduleValue) return;
    const dt = new Date(scheduleValue);
    setConsultation({
      status: "scheduled",
      date: dt.toLocaleDateString(intlLocale, { weekday: "short", month: "short", day: "numeric" }),
      time: dt.toLocaleTimeString(intlLocale, { hour: "numeric", minute: "2-digit" }),
    });
    setIsScheduling(false);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* العودة ورأس الصفحة */}
      <div className="flex flex-col gap-3">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
          style={{ color: "var(--text2)" }}
        >
          <Icon name="arrow_back" size={16} />
          <span>{t("@legalos.crm.detail.allLeads")}</span>
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name={lead.company ? "business" : "person"} size={22} />
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                {lead.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="neutral">{t(stageMeta.labelKey)}</Badge>
              {lead.conflictStatus !== "clear" && (
                <Badge color={conflictMeta.color}>{t(conflictMeta.labelKey)}</Badge>
              )}
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {lead.matterType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <span>{t("@legalos.crm.detail.logInteraction")}</span>
            </Button>
            <Button>
              <span>{t("@legalos.crm.detail.convertToClient")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* تفاصيل العميل والسجل الزمني */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* الخط الزمني */}
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.crm.detail.timeline")}
            </h2>
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {lead.timeline.map((entry, i) => (
                <div key={`${entry.time}-${i}`} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-[var(--surface2)]" style={{ color: "var(--text2)" }}>
                      <Icon name={TIMELINE_ICON_NAME[entry.type]} size={16} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold" style={{ color: "var(--text)" }}>
                        {entry.who} · {t(TIMELINE_LABEL_KEY[entry.type])}
                      </span>
                      <span style={{ color: "var(--text2)" }}>{entry.text}</span>
                    </div>
                  </div>
                  <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text3)" }}>
                    {entry.time}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* الرسائل المتبادلة */}
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.crm.detail.messagesHeading")}
            </h2>
            {(() => {
              const logged = lead.timeline.filter(
                (e) => e.type === "email" || e.type === "whatsapp"
              );
              if (logged.length === 0) {
                return (
                  <EmptyState
                    title={t("@legalos.crm.detail.messagesEmptyTitle")}
                    description={t("@legalos.crm.detail.messagesEmptyDescription")}
                  />
                );
              }
              return (
                <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                  {logged.map((entry, i) => (
                    <div key={`${entry.time}-${i}`} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-[var(--surface2)]" style={{ color: "var(--text2)" }}>
                          <Icon name={TIMELINE_ICON_NAME[entry.type]} size={16} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold" style={{ color: "var(--text)" }}>
                            {entry.who} · {t(TIMELINE_LABEL_KEY[entry.type])}
                          </span>
                          <span style={{ color: "var(--text2)" }}>{entry.text}</span>
                        </div>
                      </div>
                      <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text3)" }}>
                        {entry.time}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>

          {/* الملاحظات */}
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.crm.detail.notes")}
            </h2>
            <div className="flex flex-col gap-2">
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder={t("@legalos.crm.detail.addNotePlaceholder")}
                rows={2}
                className="w-full text-xs p-3 rounded-md border outline-none transition-colors"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface2)",
                  color: "var(--text)",
                }}
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!draftNote.trim()}
                  onClick={addNote}
                >
                  <span>{t("@legalos.crm.detail.addNote")}</span>
                </Button>
              </div>
            </div>

            {notes.length > 0 && (
              <div className="pt-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
                {notes.map((note, i) => (
                  <div key={i} className="p-2.5 rounded-md text-xs bg-[var(--surface2)]" style={{ color: "var(--text)" }}>
                    {note}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* الشريط الجانبي للمعلومات */}
        <div className="flex flex-col gap-5">
          {/* بيانات العميل المحتمل */}
          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.crm.detail.leadDetails")}
            </h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text2)" }}>{t("@legalos.crm.detail.field.source")}</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{lead.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text2)" }}>{t("@legalos.crm.detail.field.estimatedValue")}</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{formatEGP(lead.estValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text2)" }}>{t("@legalos.crm.detail.field.assignedTo")}</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{lead.assignedTo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text2)" }}>{t("@legalos.crm.detail.field.created")}</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{lead.createdLabel}</span>
              </div>
            </div>
            {lead.lostReason && (
              <div className="pt-2 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                Lost — {lead.lostReason}
              </div>
            )}
          </Card>

          {/* فحص تعارض المصالح */}
          <Card className="p-5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Icon name="verified_user" size={18} />
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.crm.detail.conflictCheck")}
              </h3>
            </div>
            <div>
              <Badge color={conflictMeta.color}>{t(conflictMeta.labelKey)}</Badge>
            </div>
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {lead.conflictNote}
            </p>
          </Card>

          {/* الاستشارة */}
          <Card className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="schedule" size={18} />
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.crm.detail.consultation")}
              </h3>
            </div>

            {consultation.status === "completed" && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text)" }}>
                  Held {consultation.date} at {consultation.time}
                </span>
                <Badge color="neutral">{t("@legalos.crm.detail.completed")}</Badge>
              </div>
            )}

            {consultation.status === "scheduled" && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text)" }}>
                  {consultation.date} at {consultation.time}
                </span>
                <Badge color="primary">{t("@legalos.crm.detail.scheduled")}</Badge>
              </div>
            )}

            {consultation.status === "none" && !isScheduling && (
              <div className="flex flex-col gap-2.5 text-xs">
                <span style={{ color: "var(--text2)" }}>
                  {t("@legalos.crm.detail.noConsultation")}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsScheduling(true)}
                >
                  <span>{t("@legalos.crm.detail.scheduleConsultation")}</span>
                </Button>
              </div>
            )}

            {isScheduling && (
              <div className="flex flex-col gap-2.5">
                <input
                  type="datetime-local"
                  value={scheduleValue ?? ""}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  className="text-xs p-2 rounded border outline-none"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface2)",
                    color: "var(--text)",
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={!scheduleValue}
                    onClick={confirmSchedule}
                  >
                    <span>{t("@legalos.crm.detail.confirm")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsScheduling(false)}
                  >
                    <span>{t("@legalos.crm.detail.cancel")}</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* الاستشارة بالذكاء الاصطناعي */}
          <Card className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="auto_awesome" size={18} />
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.crm.detail.askAi")}
              </h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
              {t("@legalos.crm.detail.askAiPrompt", {
                name: lead.name,
                matterType: lead.matterType.toLowerCase(),
              })}
            </p>
            <Button variant="secondary" size="sm">
              <span>{t("@legalos.crm.detail.draftFollowUp")}</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
