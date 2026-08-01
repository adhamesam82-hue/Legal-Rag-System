"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Divider } from "@astryxdesign/core/Divider";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ClockIcon,
  ScaleIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import {
  clientById,
  mattersForClient,
  invoicesForClient,
  activityForClient,
  MATTER_TIMELINE,
  DOCUMENTS,
  formatDate,
  formatEGP,
  teamMember,
} from "@/lib/legalos-data";

const AI_ICON_CLASS = "text-purple-vivid";

const STATUS_LABEL: Record<string, "success" | "warning" | "neutral"> = {
  Active: "success",
  "On Hold": "warning",
  Closed: "neutral",
};

const TIMELINE_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  milestone: FlagIcon,
  filing: DocumentTextIcon,
  communication: ChatBubbleLeftRightIcon,
  billing: BanknotesIcon,
};

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const client = clientById(id);

  if (!client) {
    notFound();
  }

  const matters = mattersForClient(client.id);
  const activeMatters = matters.filter((m) => m.status === "Active");
  const matterIds = matters.map((m) => m.id);
  const documents = DOCUMENTS.filter((d) => matterIds.includes(d.matterId));
  const invoices = invoicesForClient(client.id);
  const outstanding = invoices
    .filter((i) => i.status === "Sent" || i.status === "Overdue")
    .reduce((sum, i) => sum + i.amount, 0);
  const timeline = MATTER_TIMELINE.filter((e) => matterIds.includes(e.matterId)).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  );
  const activity = activityForClient(client.id).sort((a, b) => (a.when < b.when ? 1 : -1));

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={3}>
            <Link href="/clients" color="secondary">
              <HStack gap={1} vAlign="center">
                <Icon icon={ArrowLeftIcon} size="sm" color="inherit" />
                All clients
              </HStack>
            </Link>
            <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Heading level={2}>{client.name}</Heading>
                  {client.status === "Inactive" && <Badge variant="neutral" label="Inactive" />}
                </HStack>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Text type="body" color="secondary">
                    {client.type}
                  </Text>
                  <Text type="body" color="secondary">
                    {"·"}
                  </Text>
                  <Text type="body" color="secondary">
                    {client.industry}
                  </Text>
                  <Text type="body" color="secondary">
                    {"·"}
                  </Text>
                  <Text type="body" color="secondary">
                    Client since {formatDate(client.since)}
                  </Text>
                </HStack>
              </VStack>
              <HStack gap={2}>
                <Button
                  label="Edit client"
                  variant="secondary"
                  icon={<Icon icon={PencilSquareIcon} size="sm" />}
                >
                  Edit client
                </Button>
                <Button
                  label="New matter"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                >
                  New matter
                </Button>
              </HStack>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          <Grid columns={3} gap={6}>
            <GridSpan columns={2}>
              <VStack gap={6}>
                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <HStack gap={2} vAlign="center">
                        <Icon icon={BriefcaseIcon} size="sm" color="secondary" />
                        <Heading level={4}>Matters &amp; cases</Heading>
                        <Badge variant="neutral" label={`${activeMatters.length} active`} />
                      </HStack>
                      <Link href="/matters">All matters</Link>
                    </HStack>
                    {matters.length > 0 ? (
                      <List hasDividers density="balanced">
                        {matters.map((matter) => (
                          <ListItem
                            key={matter.id}
                            href={`/matters/${matter.id}`}
                            label={matter.name}
                            description={`${matter.type} · ${teamMember(matter.responsibleLawyerId).name}`}
                            startContent={
                              <Icon
                                icon={matter.caseId ? ScaleIcon : BriefcaseIcon}
                                size="sm"
                                color="secondary"
                              />
                            }
                            endContent={
                              <Badge
                                variant={STATUS_LABEL[matter.status]}
                                label={matter.status}
                              />
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState
                        isCompact
                        title="No matters yet"
                        description="Open a new matter for this client to start tracking work."
                      />
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <HStack gap={2} vAlign="center">
                        <Icon icon={BanknotesIcon} size="sm" color="secondary" />
                        <Heading level={4}>Invoices</Heading>
                      </HStack>
                      <Link href="/billing">Open billing</Link>
                    </HStack>
                    {invoices.length > 0 ? (
                      <VStack gap={4}>
                        <MetadataList>
                          <MetadataListItem label="Outstanding balance">
                            <Text type="body" weight="bold">
                              {formatEGP(outstanding)}
                            </Text>
                          </MetadataListItem>
                        </MetadataList>
                        <List hasDividers density="compact">
                          {invoices.map((inv) => (
                            <ListItem
                              key={inv.id}
                              label={inv.number}
                              description={`Issued ${formatDate(inv.issuedDate)} · Due ${formatDate(inv.dueDate)}`}
                              startContent={
                                <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                              }
                              endContent={
                                <HStack gap={2} vAlign="center">
                                  <Text type="body" weight="semibold">
                                    {formatEGP(inv.amount)}
                                  </Text>
                                  <Badge
                                    variant={
                                      inv.status === "Paid"
                                        ? "success"
                                        : inv.status === "Overdue"
                                          ? "error"
                                          : "neutral"
                                    }
                                    label={inv.status}
                                  />
                                </HStack>
                              }
                            />
                          ))}
                        </List>
                      </VStack>
                    ) : (
                      <EmptyState isCompact title="No invoices yet" />
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <HStack gap={2} vAlign="center">
                        <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                        <Heading level={4}>Documents</Heading>
                        <Badge variant="neutral" label={`${documents.length}`} />
                      </HStack>
                      <Link href="/documents">All documents</Link>
                    </HStack>
                    {documents.length > 0 ? (
                      <List hasDividers density="compact">
                        {documents.slice(0, 6).map((doc) => (
                          <ListItem
                            key={doc.id}
                            label={doc.name}
                            description={`${doc.type} · ${doc.size} · uploaded by ${doc.uploadedBy}`}
                            startContent={
                              <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                            }
                            endContent={
                              <Text type="supporting" color="secondary">
                                {formatDate(doc.uploadedAt)}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState isCompact title="No documents uploaded yet" />
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Timeline</Heading>
                    {timeline.length > 0 ? (
                      <List density="balanced">
                        {timeline.map((event, i) => (
                          <ListItem
                            key={`${event.matterId}-${event.date}-${i}`}
                            label={event.label}
                            description={
                              event.detail ? (
                                <VStack gap={0}>
                                  <Text type="supporting" color="secondary">
                                    {event.detail}
                                  </Text>
                                  <Text type="supporting" color="secondary">
                                    {formatDate(event.date)}
                                  </Text>
                                </VStack>
                              ) : (
                                formatDate(event.date)
                              )
                            }
                            startContent={
                              <Icon icon={TIMELINE_ICON[event.kind]} size="sm" color="secondary" />
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState isCompact title="No timeline events yet" />
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Activity feed</Heading>
                    {activity.length > 0 ? (
                      <List hasDividers density="compact">
                        {activity.map((a) => (
                          <ListItem
                            key={a.id}
                            label={a.who}
                            description={a.what}
                            startContent={<Avatar name={a.who} size="sm" tooltip={false} />}
                            endContent={
                              <Text type="supporting" color="secondary">
                                {formatDate(a.when.slice(0, 10))}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState isCompact title="No activity yet" />
                    )}
                  </VStack>
                </Card>
              </VStack>
            </GridSpan>

            <VStack gap={6}>
              <Card>
                <VStack gap={4}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={BuildingOffice2Icon} size="sm" color="secondary" />
                    <Heading level={4}>Company information</Heading>
                  </HStack>
                  <MetadataList>
                    {client.registrationNumber && (
                      <MetadataListItem label="Registration no.">
                        {client.registrationNumber}
                      </MetadataListItem>
                    )}
                    {client.taxId && (
                      <MetadataListItem label="Tax ID">{client.taxId}</MetadataListItem>
                    )}
                    <MetadataListItem label="Address">
                      <HStack gap={1} vAlign="start">
                        <Icon icon={MapPinIcon} size="xsm" color="secondary" />
                        <Text type="body">{client.address}</Text>
                      </HStack>
                    </MetadataListItem>
                    <MetadataListItem label="Phone">
                      <HStack gap={1} vAlign="center">
                        <Icon icon={PhoneIcon} size="xsm" color="secondary" />
                        <Text type="body">{client.phone}</Text>
                      </HStack>
                    </MetadataListItem>
                    <MetadataListItem label="Email">
                      <HStack gap={1} vAlign="center">
                        <Icon icon={EnvelopeIcon} size="xsm" color="secondary" />
                        <Text type="body">{client.email}</Text>
                      </HStack>
                    </MetadataListItem>
                  </MetadataList>
                  {client.notes && (
                    <>
                      <Divider />
                      <Text type="supporting" color="secondary">
                        {client.notes}
                      </Text>
                    </>
                  )}
                </VStack>
              </Card>

              <Card>
                <VStack gap={4}>
                  <Heading level={4}>People &amp; representatives</Heading>
                  <List hasDividers density="balanced">
                    {client.contacts.map((contact) => (
                      <ListItem
                        key={contact.id}
                        label={contact.name}
                        description={contact.title}
                        startContent={<Avatar name={contact.name} size="sm" tooltip={false} />}
                        endContent={
                          contact.isPrimary ? <Badge variant="neutral" label="Primary" /> : undefined
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </Card>

              <Card variant="purple">
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                    <Heading level={4}>Ask AI</Heading>
                  </HStack>
                  <Text type="body">
                    Ask about this client&apos;s matters, invoices, or documents in natural
                    language, grounded in the firm&apos;s records.
                  </Text>
                  <Button label="Ask AI Assistant" variant="secondary" size="sm">
                    Ask AI Assistant
                  </Button>
                </VStack>
              </Card>

              <Card>
                <VStack gap={3}>
                  <Heading level={4}>Quick links</Heading>
                  <VStack gap={2}>
                    <Link href="/time-tracking">
                      <HStack gap={2} vAlign="center">
                        <Icon icon={ClockIcon} size="sm" color="secondary" />
                        Time tracking
                      </HStack>
                    </Link>
                    <Link href="/documents">
                      <HStack gap={2} vAlign="center">
                        <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                        All documents
                      </HStack>
                    </Link>
                    <Link href="/billing">
                      <HStack gap={2} vAlign="center">
                        <Icon icon={BanknotesIcon} size="sm" color="secondary" />
                        Billing
                      </HStack>
                    </Link>
                  </VStack>
                </VStack>
              </Card>
            </VStack>
          </Grid>
        </LayoutContent>
      }
    />
  );
}
