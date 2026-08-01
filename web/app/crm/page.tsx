"use client";

import NextLink from "next/link";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
  UserIcon,
  PlusIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg } from "@/lib/org";
import { LEADS, STAGE_META, STAGE_ORDER, formatEGP, formatEGPCompact, type Lead } from "./data";

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
  return (
    <NextLink href={`/crm/${lead.id}`} className="block">
      <Card
        padding={4}
        className="cursor-pointer transition-colors hover:bg-muted"
      >
        <VStack gap={2}>
          <HStack hAlign="between" vAlign="start" gap={2}>
            <Text type="label" weight="semibold" maxLines={2}>
              {lead.name}
            </Text>
            <Icon
              icon={lead.company ? BuildingOffice2Icon : UserIcon}
              size="sm"
              color="secondary"
            />
          </HStack>
          <Text type="supporting" color="secondary" maxLines={2}>
            {lead.matterType}
          </Text>
          <Divider />
          <VStack gap={0.5}>
            <Text type="supporting" color="secondary" maxLines={2}>
              {lead.source}
            </Text>
            <Text type="label" weight="semibold">
              {formatEGPCompact(lead.estValue)}
            </Text>
          </VStack>
          {lead.conflictStatus === "flagged" && (
            <Badge
              variant="warning"
              label={t("@legalos.crm.conflictFlagged")}
              icon={<Icon icon={ExclamationTriangleIcon} size="xsm" color="inherit" />}
            />
          )}
        </VStack>
      </Card>
    </NextLink>
  );
}

function PipelineColumn({ stage }: { stage: (typeof STAGE_ORDER)[number] }) {
  const t = useTranslator();
  const leads = LEADS.filter((l) => l.stage === stage);
  const total = leads.reduce((sum, l) => sum + l.estValue, 0);
  const meta = STAGE_META[stage];

  return (
    // size="static" is what makes the track a track: without it the six
    // columns shrink to share the viewport instead of scrolling, and at
    // 1280 they land near 148px each — narrow enough that every lead name
    // wraps to two lines and the width prop reads as decoration.
    <StackItem size="static">
      <VStack width={272} gap={3}>
      {/* Fixed height, and the stage name gets exactly two lines of it: the
       *  longest name ("Consultation Scheduled") wraps while its neighbours
       *  stay on one line, which otherwise drops that column's subtitle and
       *  first card below every other column's and leaves the board ragged. */}
      <VStack gap={0.5} height={72}>
        <HStack hAlign="between" vAlign="start" gap={2}>
          <VStack height={40}>
            <Text type="label" weight="semibold" maxLines={2}>
              {t(meta.labelKey)}
            </Text>
          </VStack>
          <Badge variant="neutral" label={String(leads.length)} />
        </HStack>
        <Text type="supporting" color="secondary" maxLines={1}>
          {t("@legalos.crm.stageTotal", { value: formatEGPCompact(total) })}
        </Text>
      </VStack>
      {leads.length === 0 ? (
        <EmptyState
          isCompact
          icon={<Icon icon={InboxIcon} size="md" color="secondary" />}
          title={t("@legalos.crm.empty.title")}
          description={t("@legalos.crm.empty.description")}
        />
      ) : (
        <VStack gap={3}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </VStack>
      )}
      </VStack>
    </StackItem>
  );
}

export default function CrmPage() {
  const t = useTranslator();
  const { organizationName } = useOrg();
  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="start">
              <VStack gap={1}>
                <Heading level={2}>{t("@legalos.crm.heading")}</Heading>
                <HStack gap={1} vAlign="center">
                  <Text type="body" color="secondary">
                    {t("@legalos.crm.subtitle", { firm: organizationName ?? "" })}
                  </Text>
                  <Link href="/clients">{t("@legalos.crm.viewExistingClients")}</Link>
                </HStack>
              </VStack>
              <Button
                label={t("@legalos.crm.newLead")}
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                {t("@legalos.crm.newLead")}
              </Button>
            </HStack>

            <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      {t("@legalos.crm.kpi.openLeads")}
                    </Text>
                    <Icon icon={UserGroupIcon} size="sm" color="secondary" />
                  </HStack>
                  <Text size="2xl" weight="semibold">{openLeads.length}</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.crm.kpi.openLeadsDetail", {
                      count: STAGE_ORDER.length - 2,
                    })}
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      {t("@legalos.crm.kpi.pipelineValue")}
                    </Text>
                    <Icon icon={BanknotesIcon} size="sm" color="secondary" />
                  </HStack>
                  <Text size="2xl" weight="semibold">{formatEGPCompact(openPipelineValue)}</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.crm.kpi.pipelineValueDetail")}
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      {t("@legalos.crm.kpi.wonThisMonth")}
                    </Text>
                    <Icon icon={UserGroupIcon} size="sm" color="secondary" />
                  </HStack>
                  <Text size="2xl" weight="semibold">{formatEGP(wonValue)}</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.crm.kpi.wonDetail", { count: wonLeads.length })}
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      {t("@legalos.crm.kpi.conflictsFlagged")}
                    </Text>
                    <Icon icon={ExclamationTriangleIcon} size="sm" color="secondary" />
                  </HStack>
                  <Text size="2xl" weight="semibold">{flaggedCount}</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.crm.kpi.conflictsDetail")}
                  </Text>
                </VStack>
              </Card>
            </Grid>

            <HStack gap={4} isScrollable vAlign="start">
              {STAGE_ORDER.map((stage) => (
                <PipelineColumn key={stage} stage={stage} />
              ))}
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
