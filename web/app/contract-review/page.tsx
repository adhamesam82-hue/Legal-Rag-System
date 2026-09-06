"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";

// ---------------------------------------------------------------------------
// Mock contract + AI review. The contract below is synthetic sample text
// written for this concept build, not a real executed agreement.
// ---------------------------------------------------------------------------

interface Clause {
  id: string;
  number: string;
  heading: string;
  body: string;
  risk?: "high" | "medium" | "low";
}

const CLAUSES: Clause[] = [
  {
    id: "c1",
    number: "1",
    heading: "Definitions",
    body: "“Confidential Information” means any information disclosed by either party to the other, whether orally, in writing, or in any other form, that is designated as confidential or that reasonably ought to be understood to be confidential given the nature of the information and the circumstances of disclosure.",
  },
  {
    id: "c2",
    number: "2",
    heading: "Obligations of the Receiving Party",
    body: "The Receiving Party shall hold the Confidential Information in strict confidence and shall not disclose it to any third party without the prior written consent of the Disclosing Party. The Receiving Party shall protect the Confidential Information using the same degree of care it uses for its own confidential information.",
    risk: "medium",
  },
  {
    id: "c3",
    number: "3",
    heading: "Term and Duration",
    body: "This Agreement shall remain in effect indefinitely from the Effective Date, and the confidentiality obligations set out in Clause 2 shall survive termination in perpetuity.",
    risk: "high",
  },
  {
    id: "c4",
    number: "4",
    heading: "Permitted Disclosures",
    body: "The Receiving Party may disclose Confidential Information to the extent required by a competent judicial or governmental authority, provided that the Receiving Party gives prompt written notice to the Disclosing Party.",
  },
  {
    id: "c5",
    number: "5",
    heading: "Remedies",
    body: "The Disclosing Party shall be entitled to seek injunctive relief and to recover all losses, damages, costs, and expenses of any kind arising from any breach, without limitation and without any requirement to prove actual loss.",
    risk: "high",
  },
  {
    id: "c6",
    number: "6",
    heading: "Governing Law",
    body: "This Agreement shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt. The parties submit to the exclusive jurisdiction of the courts of Cairo.",
  },
];

const RISKS = [
  {
    clause: "Clause 3 — Term and Duration",
    severity: "high" as const,
    finding:
      "Perpetual confidentiality with no defined term. Egyptian courts have declined to enforce indefinite restraints where no reasonable time limit is stated; an unbounded obligation risks being read down or struck entirely.",
    suggestion:
      "Set a definite term — commonly 3 to 5 years from disclosure — with a carve-out allowing trade secrets to survive for as long as they remain secret.",
  },
  {
    clause: "Clause 5 — Remedies",
    severity: "high" as const,
    finding:
      "Unlimited liability with no cap and an express waiver of the requirement to prove actual loss. This deviates materially from the firm's standard template, which caps liability at fees paid or a stated sum.",
    suggestion:
      "Introduce a liability cap and delete the waiver of proof of loss. Under Egyptian Civil Code principles, compensation tracks actual damage sustained [Law 131/1948, Art. 221].",
  },
  {
    clause: "Clause 2 — Obligations of the Receiving Party",
    severity: "medium" as const,
    finding:
      "The standard of care is defined by reference to the Receiving Party's own practices, which are unknown and unauditable. A party with weak internal controls would owe a correspondingly weak duty.",
    suggestion:
      "Replace with an objective floor: “no less than a reasonable degree of care,” retaining the own-practices comparison only as an additional minimum.",
  },
];

const MISSING = [
  {
    label: "Return or destruction of materials",
    detail:
      "No clause requires the Receiving Party to return or destroy Confidential Information on termination or on request.",
  },
  {
    label: "Definition carve-outs",
    detail:
      "Standard exclusions are absent — information already public, independently developed, or lawfully received from a third party is not excluded from the definition.",
  },
  {
    label: "Notices",
    detail: "No clause specifies addresses or a method for formal notice between the parties.",
  },
  {
    label: "Assignment",
    detail: "The agreement is silent on whether either party may assign its rights or obligations.",
  },
];

const SEVERITY_BADGE = {
  high: { variant: "neutral" as const, labelKey: "@legalos.contractReview.severityBadge.high" },
  medium: { variant: "neutral" as const, labelKey: "@legalos.contractReview.severityBadge.medium" },
  low: { variant: "neutral" as const, labelKey: "@legalos.contractReview.severityBadge.low" },
};

export default function ContractReviewPage() {
  const t = useTranslator();
  const [panel, setPanel] = useState<"risks" | "missing" | "summary">("risks");
  const [selected, setSelected] = useState<string | null>("c3");

  const riskScore = 68;
  const highRiskCount = RISKS.filter((r) => r.severity === "high").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.contractReview.matterTitle")}
            </h1>
            <Badge color="primary">
              {t("@legalos.contractReview.reviewCompleteBadge")}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/matters/delta-foods-nda-review"
              className="hover:underline font-medium"
              style={{ color: "var(--primary)" }}
            >
              {t("@legalos.contractReview.matterLink")}
            </Link>
            <span style={{ color: "var(--text2)" }}>
              {t("@legalos.contractReview.matterMeta", { count: CLAUSES.length })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <Icon name="upload" size={16} />
            <span>{t("@legalos.contractReview.uploadButton.label")}</span>
          </Button>
          <Button>
            <span>{t("@legalos.contractReview.exportButton")}</span>
          </Button>
        </div>
      </div>

      {/* المحتوى الرئيسي ولوحة التحليل الذكي */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* نص العقد والبنود */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="description" size={18} />
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.contractReview.contractTextHeading")}
              </h2>
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.contractReview.syntheticSampleNote")}
              </span>
            </div>

            <div className="flex flex-col gap-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              {CLAUSES.map((c) => {
                const isSelected = selected === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--surface2)]"
                        : "border-[var(--border)] hover:bg-[var(--surface2)]"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs" style={{ color: "var(--text)" }}>
                          {c.number}. {c.heading}
                        </span>
                        {c.risk && (
                          <Badge color={c.risk === "high" ? "primary" : "neutral"}>
                            {t(SEVERITY_BADGE[c.risk].labelKey)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                        {c.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* لوحة نتائج الفحص الذكي */}
        <div className="w-full lg:w-96 flex flex-col gap-5 flex-shrink-0">
          {/* بطاقة تقييم المخاطر */}
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="auto_awesome" size={18} />
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.contractReview.aiReviewHeading")}
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text)" }}>
                  {t("@legalos.contractReview.riskScoreLabel")}
                </span>
                <span className="font-bold" style={{ color: "var(--text)" }}>
                  {t("@legalos.contractReview.riskScoreValue", { score: riskScore })}
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--surface3)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${riskScore}%`,
                    backgroundColor: "var(--warn)",
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.contractReview.riskScoreDescription", {
                  highCount: highRiskCount,
                  missingCount: MISSING.length,
                })}
              </span>
            </div>

            <div className="pt-3 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
              {t("@legalos.contractReview.draftingAidDisclaimer")}
            </div>
          </Card>

          {/* التبويبات الثلاثة */}
          <div className="flex rounded-md p-1 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
            <button
              type="button"
              onClick={() => setPanel("risks")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                panel === "risks"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {t("@legalos.contractReview.tab.risks")}
            </button>
            <button
              type="button"
              onClick={() => setPanel("missing")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                panel === "missing"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {t("@legalos.contractReview.tab.missing")}
            </button>
            <button
              type="button"
              onClick={() => setPanel("summary")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                panel === "summary"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {t("@legalos.contractReview.tab.summary")}
            </button>
          </div>

          {/* محتوى التبويب */}
          {panel === "risks" && (
            <div className="flex flex-col gap-4">
              {RISKS.map((r) => (
                <Card key={r.clause} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Icon name="warning" size={16} />
                    <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                      {r.clause}
                    </h3>
                  </div>
                  <div>
                    <Badge color={r.severity === "high" ? "primary" : "neutral"}>
                      {t(SEVERITY_BADGE[r.severity].labelKey)}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                    {r.finding}
                  </p>
                  <div className="p-2.5 rounded-md border flex items-start gap-2 text-xs" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
                    <Icon name="lightbulb" size={16} />
                    <span style={{ color: "var(--text2)" }}>{r.suggestion}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="secondary" size="sm">
                      <span>{t("@legalos.contractReview.applySuggestion")}</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <span>{t("@legalos.contractReview.dismissFinding.children")}</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {panel === "missing" && (
            <Card className="p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.contractReview.missingClausesHeading")}
              </h3>
              <p className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.contractReview.missingClausesDescription")}
              </p>
              <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                {MISSING.map((m) => (
                  <div key={m.label} className="py-3 flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                        {m.label}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                        {m.detail}
                      </span>
                    </div>
                    <Button variant="secondary" size="sm">
                      <span>{t("@legalos.contractReview.insertButton.label")}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {panel === "summary" && (
            <Card className="p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.contractReview.recommendationsHeading")}
              </h3>
              <p className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.contractReview.summary.intro")}
              </p>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.contractReview.summary.item1.label")}
                  </span>
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.contractReview.summary.item1.description")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.contractReview.summary.item2.label")}
                  </span>
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.contractReview.summary.item2.description")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.contractReview.summary.item3.label", { count: MISSING.length })}
                  </span>
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.contractReview.summary.item3.description")}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <Link
                  href="/knowledge-base"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {t("@legalos.contractReview.compareTemplateLink")}
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
