"use client";

import NextLink from "next/link";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
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
              label="Conflict flagged"
              icon={<Icon icon={ExclamationTriangleIcon} size="xsm" color="inherit" />}
            />
          )}
        </VStack>
      </Card>
    </NextLink>
  );
}

function PipelineColumn({ stage }: { stage: (typeof STAGE_ORDER)[number] }) {
  const leads = LEADS.filter((l) => l.stage === stage);
  const total = leads.reduce((sum, l) => sum + l.estValue, 0);
  const meta = STAGE_META[stage];

  return (
    <VStack width={272} gap={3}>
      {/* Fixed height: the longest stage name ("Consultation Scheduled")
       *  wraps to two lines while its neighbours stay on one, which would
       *  otherwise start each column's cards at a different y and leave the
       *  board's card tops ragged. */}
      <VStack gap={0.5} height={68}>
        <HStack hAlign="between" vAlign="start" gap={2}>
          <Text type="label" weight="semibold" maxLines={2}>
            {meta.label}
          </Text>
          <Badge variant="neutral" label={String(leads.length)} />
        </HStack>
        <Text type="supporting" color="secondary" maxLines={1}>
          {formatEGPCompact(total)} in this stage
        </Text>
      </VStack>
      {leads.length === 0 ? (
        <EmptyState
          isCompact
          icon={<Icon icon={InboxIcon} size="md" color="secondary" />}
          title="No leads"
          description="Leads moved to this stage appear here."
        />
      ) : (
        <VStack gap={3}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </VStack>
      )}
    </VStack>
  );
}

export default function CrmPage() {
  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="start">
              <VStack gap={1}>
                <Heading level={2}>CRM Pipeline</Heading>
                <HStack gap={1} vAlign="center">
                  <Text type="body" color="secondary">
                    Al-Sayed &amp; Partners · Prospective clients ·
                  </Text>
                  <Link href="/clients">View existing clients</Link>
                </HStack>
              </VStack>
              <Button
                label="New lead"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                New lead
              </Button>
            </HStack>

            <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      Open leads
                    </Text>
                    <Icon icon={UserGroupIcon} size="sm" color="secondary" />
                  </HStack>
                  <Heading level={2}>{openLeads.length}</Heading>
                  <Text type="supporting" color="secondary">
                    Across {STAGE_ORDER.length - 2} active stages
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      Open pipeline value
                    </Text>
                    <Icon icon={BanknotesIcon} size="sm" color="secondary" />
                  </HStack>
                  <Heading level={2}>{formatEGPCompact(openPipelineValue)}</Heading>
                  <Text type="supporting" color="secondary">
                    Estimated, not yet won
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      Won this month
                    </Text>
                    <Icon icon={UserGroupIcon} size="sm" color="secondary" />
                  </HStack>
                  <Heading level={2}>{formatEGP(wonValue)}</Heading>
                  <Text type="supporting" color="secondary">
                    {wonLeads.length} lead converted
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label" color="secondary">
                      Conflict checks flagged
                    </Text>
                    <Icon icon={ExclamationTriangleIcon} size="sm" color="secondary" />
                  </HStack>
                  <Heading level={2}>{flaggedCount}</Heading>
                  <Text type="supporting" color="secondary">
                    Awaiting partner review
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
