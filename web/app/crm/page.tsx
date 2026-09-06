"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { LEADS, STAGE_META, STAGE_ORDER, type Lead } from "./data";
import { useFormat } from "@/lib/i18n/format";

// ---------------------------------------------------------------------------
// CRM pipeline for prospective clients (leads). Distinct from /clients, which
// covers existing client companies. No CRM backend exists yet — this is the
// UI-concept pass; the board is a static column layout rather than real
// drag-and-drop.
// ---------------------------------------------------------------------------

const openLeads = LEADS.filter((l) => l.stage !== "won" && l.stage !== "lost");
const openPipelineValue = openLeads.reduce((sum, l) => sum + l.estValue, 0);
const wonLeads = LEADS.filter((l) => l.stage === "won");
const wonValue = wonLeads.reduce((sum, l) => sum + l.estValue, 0);
const flaggedCount = LEADS.filter((l) => l.conflictStatus === "flagged").length;

function LeadCard({ lead }: { lead: Lead }) {
  const t = useTranslator();
  const { formatEGPCompact } = useFormat();
  return (
    <Link href={`/crm/${lead.id}`} className="block">
      <Card className="p-4 cursor-pointer hover:bg-[var(--surface2)] transition-colors flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold line-clamp-2" style={{ color: "var(--text)" }}>
            {lead.name}
          </span>
          <span className="text-[11px] line-clamp-2" style={{ color: "var(--text2)" }}>
            {lead.matterType}
          </span>
        </div>

        <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--border)" }}>
          <span className="truncate" style={{ color: "var(--text2)" }}>
            {lead.source}
          </span>
          <span className="font-bold" style={{ color: "var(--text)" }}>
            {formatEGPCompact(lead.estValue)}
          </span>
        </div>

        {lead.conflictStatus === "flagged" && (
          <div className="pt-1">
            <Badge color="primary">
              <Icon name="warning" size={12} />
              <span>{t("@legalos.crm.conflictFlagged")}</span>
            </Badge>
          </div>
        )}
      </Card>
    </Link>
  );
}

function PipelineColumn({ stage }: { stage: (typeof STAGE_ORDER)[number] }) {
  const t = useTranslator();
  const { formatEGPCompact } = useFormat();
  const leads = LEADS.filter((l) => l.stage === stage);
  const total = leads.reduce((sum, l) => sum + l.estValue, 0);
  const meta = STAGE_META[stage];

  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-3">
      <div className="h-16 flex flex-col justify-between p-2 rounded-lg" style={{ backgroundColor: "var(--surface2)" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold line-clamp-2" style={{ color: "var(--text)" }}>
            {t(meta.labelKey)}
          </span>
          <Badge color="neutral">{leads.length}</Badge>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text2)" }}>
          {t("@legalos.crm.stageTotal", { value: formatEGPCompact(total) })}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="p-4 border border-dashed rounded-lg text-center" style={{ borderColor: "var(--border)" }}>
          <EmptyState
            icon={<Icon name="inbox" size={24} />}
            title={t("@legalos.crm.empty.title")}
            description={t("@legalos.crm.empty.description")}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CrmPage() {
  const t = useTranslator();
  const { formatEGP, formatEGPCompact } = useFormat();
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.crm.heading")}
          </h1>
          <Link
            href="/clients"
            className="text-xs hover:underline font-medium"
            style={{ color: "var(--primary)" }}
          >
            {t("@legalos.crm.viewExistingClients")}
          </Link>
        </div>

        <Button>
          <Icon name="add" size={16} />
          <span>{t("@legalos.crm.newLead")}</span>
        </Button>
      </div>

      {/* بطاقات المؤشرات الإحصائية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.openLeads")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {openLeads.length}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.openLeadsDetail", {
              count: STAGE_ORDER.length - 2,
            })}
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.pipelineValue")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {formatEGPCompact(openPipelineValue)}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.pipelineValueDetail")}
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.wonThisMonth")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {formatEGP(wonValue)}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.wonDetail", { count: wonLeads.length })}
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.conflictsFlagged")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {flaggedCount}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.crm.kpi.conflictsDetail")}
          </span>
        </Card>
      </div>

      {/* لوحة المراحل (Pipeline Board) */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_ORDER.map((stage) => (
          <PipelineColumn key={stage} stage={stage} />
        ))}
      </div>
    </div>
  );
}
