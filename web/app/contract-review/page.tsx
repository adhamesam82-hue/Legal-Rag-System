"use client";

import { useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import {
  SparklesIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
  LightBulbIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";

const AI_ICON_CLASS = "text-purple-vivid";

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
  high: { variant: "error" as const, labelKey: "@legalos.contractReview.severityBadge.high" },
  medium: { variant: "warning" as const, labelKey: "@legalos.contractReview.severityBadge.medium" },
  low: { variant: "neutral" as const, labelKey: "@legalos.contractReview.severityBadge.low" },
};

export default function ContractReviewPage() {
  const t = useTranslator();
  const [panel, setPanel] = useState("risks");
  const [selected, setSelected] = useState<string | null>("c3");

  const riskScore = 68; // higher = more risk
  const highRiskCount = RISKS.filter((r) => r.severity === "high").length;

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
            <VStack gap={1}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <Heading level={2}>{t("@legalos.contractReview.matterTitle")}</Heading>
                <Badge variant="purple" label={t("@legalos.contractReview.reviewCompleteBadge")} />
              </HStack>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Link href="/matters/delta-foods-nda-review">
                  {t("@legalos.contractReview.matterLink")}
                </Link>
                <Text type="supporting" color="secondary">
                  {t("@legalos.contractReview.matterMeta", { count: CLAUSES.length })}
                </Text>
              </HStack>
            </VStack>
            <HStack gap={2}>
              <Button
                label={t("@legalos.contractReview.uploadButton.ariaLabel")}
                variant="secondary"
                icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
              >
                {t("@legalos.contractReview.uploadButton.label")}
              </Button>
              <Button label={t("@legalos.contractReview.exportButton")} variant="primary">
                {t("@legalos.contractReview.exportButton")}
              </Button>
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <Card>
            <VStack gap={4}>
              <HStack gap={2} vAlign="center">
                <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                <Heading level={4}>{t("@legalos.contractReview.contractTextHeading")}</Heading>
                <Text type="supporting" color="secondary">
                  {t("@legalos.contractReview.syntheticSampleNote")}
                </Text>
              </HStack>
              <Divider />
              <VStack gap={5}>
                {CLAUSES.map((c) => {
                  const isSelected = selected === c.id;
                  return (
                    <Card
                      key={c.id}
                      padding={4}
                      variant={c.risk ? (isSelected ? "muted" : "default") : "transparent"}
                      onClick={() => setSelected(c.id)}
                      className="cursor-pointer"
                    >
                      <VStack gap={2}>
                        <HStack gap={2} vAlign="center" wrap="wrap">
                          <Heading level={5}>
                            {c.number}. {c.heading}
                          </Heading>
                          {c.risk && (
                            <Badge
                              variant={SEVERITY_BADGE[c.risk].variant}
                              label={t(SEVERITY_BADGE[c.risk].labelKey)}
                            />
                          )}
                        </HStack>
                        <Text type="body">{c.body}</Text>
                      </VStack>
                    </Card>
                  );
                })}
              </VStack>
            </VStack>
          </Card>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={420} padding={0} isScrollable>
          <VStack gap={6}>
            <Card variant="purple">
              <VStack gap={4}>
                <HStack gap={2} vAlign="center">
                  <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                  <Heading level={4}>{t("@legalos.contractReview.aiReviewHeading")}</Heading>
                </HStack>

                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label">{t("@legalos.contractReview.riskScoreLabel")}</Text>
                    <Text type="label" weight="bold">
                      {t("@legalos.contractReview.riskScoreValue", { score: riskScore })}
                    </Text>
                  </HStack>
                  <ProgressBar
                    label={t("@legalos.contractReview.riskScoreAriaLabel")}
                    isLabelHidden
                    value={riskScore}
                    max={100}
                    variant="warning"
                  />
                  <Text type="supporting" color="secondary">
                    {t("@legalos.contractReview.riskScoreDescription", {
                      highCount: highRiskCount,
                      missingCount: MISSING.length,
                    })}
                  </Text>
                </VStack>

                <Divider />

                <Text type="supporting" color="secondary">
                  {t("@legalos.contractReview.draftingAidDisclaimer")}
                </Text>
              </VStack>
            </Card>

            <SegmentedControl
              value={panel}
              onChange={setPanel}
              label={t("@legalos.contractReview.reviewSectionLabel")}
              layout="fill"
            >
              <SegmentedControlItem value="risks" label={t("@legalos.contractReview.tab.risks")} />
              <SegmentedControlItem
                value="missing"
                label={t("@legalos.contractReview.tab.missing")}
              />
              <SegmentedControlItem
                value="summary"
                label={t("@legalos.contractReview.tab.summary")}
              />
            </SegmentedControl>

            {panel === "risks" && (
              <VStack gap={4}>
                {RISKS.map((r) => (
                  <Card key={r.clause}>
                    <VStack gap={3}>
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Icon
                          icon={ExclamationTriangleIcon}
                          size="sm"
                          color={r.severity === "high" ? "error" : "warning"}
                        />
                        <Heading level={5}>{r.clause}</Heading>
                      </HStack>
                      <HStack hAlign="start">
                        <Badge
                          variant={SEVERITY_BADGE[r.severity].variant}
                          label={t(SEVERITY_BADGE[r.severity].labelKey)}
                        />
                      </HStack>
                      <Text type="body">{r.finding}</Text>
                      <Divider />
                      <HStack gap={2} vAlign="start">
                        <Icon icon={LightBulbIcon} size="sm" className={AI_ICON_CLASS} />
                        <Text type="body" color="secondary">
                          {r.suggestion}
                        </Text>
                      </HStack>
                      <HStack gap={2}>
                        <Button
                          label={t("@legalos.contractReview.applySuggestion")}
                          variant="secondary"
                          size="sm"
                        >
                          {t("@legalos.contractReview.applySuggestion")}
                        </Button>
                        <Button
                          label={t("@legalos.contractReview.dismissFinding.label")}
                          variant="ghost"
                          size="sm"
                        >
                          {t("@legalos.contractReview.dismissFinding.children")}
                        </Button>
                      </HStack>
                    </VStack>
                  </Card>
                ))}
              </VStack>
            )}

            {panel === "missing" && (
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>{t("@legalos.contractReview.missingClausesHeading")}</Heading>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.contractReview.missingClausesDescription")}
                  </Text>
                  <List hasDividers density="balanced">
                    {MISSING.map((m) => (
                      <ListItem
                        key={m.label}
                        label={m.label}
                        description={m.detail}
                        startContent={<Icon icon={PlusCircleIcon} size="sm" color="secondary" />}
                        endContent={
                          <Button
                            label={t("@legalos.contractReview.insertButton", { label: m.label })}
                            variant="secondary"
                            size="sm"
                          >
                            {t("@legalos.contractReview.insertButton.label")}
                          </Button>
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </Card>
            )}

            {panel === "summary" && (
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>{t("@legalos.contractReview.recommendationsHeading")}</Heading>
                  <Text type="body">{t("@legalos.contractReview.summary.intro")}</Text>
                  <Divider />
                  <List density="balanced">
                    <ListItem
                      label={t("@legalos.contractReview.summary.item1.label")}
                      description={t("@legalos.contractReview.summary.item1.description")}
                    />
                    <ListItem
                      label={t("@legalos.contractReview.summary.item2.label")}
                      description={t("@legalos.contractReview.summary.item2.description")}
                    />
                    <ListItem
                      label={t("@legalos.contractReview.summary.item3.label", {
                        count: MISSING.length,
                      })}
                      description={t("@legalos.contractReview.summary.item3.description")}
                    />
                  </List>
                  <Link href="/knowledge-base">
                    {t("@legalos.contractReview.compareTemplateLink")}
                  </Link>
                </VStack>
              </Card>
            )}
          </VStack>
        </LayoutPanel>
      }
    />
  );
}
