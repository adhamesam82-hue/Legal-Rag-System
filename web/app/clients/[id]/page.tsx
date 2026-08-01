"use client";

import { use } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  BanknotesIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { useMemberName, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import {
  formatDate,
  formatDateTime,
  formatEGP,
  label,
  type MatterStatus,
} from "@/lib/practice";

const STATUS_VARIANT: Record<MatterStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  on_hold: "warning",
  closed: "neutral",
};

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = Number(id);
  const memberName = useMemberName();

  const resource = useResource(
    async (api) => {
      const client = await api.clients.get(clientId);
      const [matters, invoices, activity] = await Promise.all([
        api.matters.list({ client_id: clientId }),
        api.invoices.list({ client_id: clientId }),
        api.activity({ client_id: clientId, limit: 25 }),
      ]);
      return { client, matters, invoices, activity };
    },
    [clientId],
  );

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0} isScrollable>
          <DataView resource={resource} loadingLabel="Loading client…">
            {({ client, matters, invoices, activity }) => {
              const outstanding = invoices
                .filter((i) => i.status === "sent" || i.status === "overdue")
                .reduce((sum, i) => sum + Number(i.amount), 0);
              const primary =
                client.contacts.find((c) => c.is_primary) ?? client.contacts[0];

              return (
                <VStack gap={6}>
                  <Link href="/clients">
                    <HStack gap={1.5} vAlign="center">
                      <Icon icon={ArrowLeftIcon} size="sm" color="secondary" />
                      <Text type="body" color="secondary">
                        Clients
                      </Text>
                    </HStack>
                  </Link>

                  <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                    <VStack gap={1}>
                      <HStack gap={3} vAlign="center">
                        <Heading level={2}>{client.name}</Heading>
                        {client.status === "inactive" && (
                          <Badge variant="neutral" label="Inactive" />
                        )}
                      </HStack>
                      <Text type="body" color="secondary">
                        {label(client.client_type)}
                        {client.industry ? ` · ${client.industry}` : ""}
                        {client.client_since
                          ? ` · client since ${formatDate(client.client_since)}`
                          : ""}
                      </Text>
                    </VStack>
                  </HStack>

                  <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          Active matters
                        </Text>
                        <Heading level={2}>
                          {matters.filter((m) => m.status === "active").length}
                        </Heading>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          Total matters
                        </Text>
                        <Heading level={2}>{matters.length}</Heading>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          Outstanding
                        </Text>
                        <Heading level={2}>{formatEGP(outstanding)}</Heading>
                      </VStack>
                    </Card>
                  </Grid>

                  <Grid columns={3} gap={6}>
                    <GridSpan columns={2}>
                      <VStack gap={6}>
                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>Matters</Heading>
                            {matters.length === 0 ? (
                              <EmptyState
                                icon={
                                  <Icon
                                    icon={BriefcaseIcon}
                                    size="lg"
                                    color="secondary"
                                  />
                                }
                                title="No matters yet"
                                description="Open a matter against this client to start work."
                              />
                            ) : (
                              <List hasDividers density="compact">
                                {matters.map((matter) => (
                                  <ListItem
                                    key={matter.id}
                                    label={matter.name}
                                    href={`/matters/${matter.id}`}
                                    description={`${label(matter.matter_type)} · ${memberName(
                                      matter.responsible_user,
                                    )}`}
                                    startContent={
                                      <Icon
                                        icon={
                                          matter.case_id ? ScaleIcon : BriefcaseIcon
                                        }
                                        size="sm"
                                        color="secondary"
                                      />
                                    }
                                    endContent={
                                      <Badge
                                        variant={STATUS_VARIANT[matter.status]}
                                        label={label(matter.status)}
                                      />
                                    }
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>

                        <Card>
                          <VStack gap={4}>
                            <HStack hAlign="between" vAlign="center">
                              <Heading level={4}>Invoices</Heading>
                              <Link href="/billing">Billing</Link>
                            </HStack>
                            {invoices.length === 0 ? (
                              <Text type="body" color="secondary">
                                No invoices raised for this client yet.
                              </Text>
                            ) : (
                              <List hasDividers density="compact">
                                {invoices.map((invoice) => (
                                  <ListItem
                                    key={invoice.id}
                                    label={invoice.number}
                                    href={`/billing/${invoice.id}`}
                                    description={`Issued ${formatDate(invoice.issued_date)} · due ${formatDate(invoice.due_date)}`}
                                    startContent={
                                      <Icon
                                        icon={BanknotesIcon}
                                        size="sm"
                                        color="secondary"
                                      />
                                    }
                                    endContent={
                                      <HStack gap={3} vAlign="center">
                                        <Text type="body" weight="semibold">
                                          {formatEGP(
                                            Number(invoice.amount),
                                            invoice.currency,
                                          )}
                                        </Text>
                                        <Badge
                                          variant={
                                            invoice.status === "paid"
                                              ? "success"
                                              : invoice.status === "overdue"
                                                ? "error"
                                                : "neutral"
                                          }
                                          label={label(invoice.status)}
                                        />
                                      </HStack>
                                    }
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>

                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>Activity</Heading>
                            {activity.length === 0 ? (
                              <Text type="body" color="secondary">
                                No activity recorded for this client yet.
                              </Text>
                            ) : (
                              <List hasDividers density="compact">
                                {activity.map((entry) => (
                                  <ListItem
                                    key={entry.id}
                                    label={memberName(entry.actor)}
                                    description={entry.action}
                                    startContent={
                                      <Avatar
                                        name={memberName(entry.actor)}
                                        size="sm"
                                        tooltip={false}
                                      />
                                    }
                                    endContent={
                                      <Text type="supporting" color="secondary">
                                        {formatDateTime(entry.occurred_at)}
                                      </Text>
                                    }
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>
                      </VStack>
                    </GridSpan>

                    <VStack gap={6}>
                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>Details</Heading>
                          <MetadataList>
                            <MetadataListItem label="Type">
                              {label(client.client_type)}
                            </MetadataListItem>
                            {client.registration_number && (
                              <MetadataListItem label="Registration">
                                {client.registration_number}
                              </MetadataListItem>
                            )}
                            {client.tax_id && (
                              <MetadataListItem label="Tax ID">
                                {client.tax_id}
                              </MetadataListItem>
                            )}
                            {client.address && (
                              <MetadataListItem label="Address">
                                {client.address}
                              </MetadataListItem>
                            )}
                            {client.phone && (
                              <MetadataListItem label="Phone">
                                {client.phone}
                              </MetadataListItem>
                            )}
                            {client.email && (
                              <MetadataListItem label="Email">
                                {client.email}
                              </MetadataListItem>
                            )}
                          </MetadataList>
                        </VStack>
                      </Card>

                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>Contacts</Heading>
                          {client.contacts.length === 0 ? (
                            <Text type="body" color="secondary">
                              No contacts recorded.
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {client.contacts.map((contact) => (
                                <ListItem
                                  key={contact.id}
                                  label={contact.name}
                                  description={
                                    [contact.title, contact.email, contact.phone]
                                      .filter(Boolean)
                                      .join(" · ") || undefined
                                  }
                                  startContent={
                                    <Avatar
                                      name={contact.name}
                                      size="sm"
                                      tooltip={false}
                                    />
                                  }
                                  endContent={
                                    contact.is_primary ? (
                                      <Badge variant="info" label="Primary" />
                                    ) : undefined
                                  }
                                />
                              ))}
                            </List>
                          )}
                        </VStack>
                      </Card>

                      {client.notes && (
                        <Card>
                          <VStack gap={3}>
                            <Heading level={4}>Notes</Heading>
                            <Text type="body">{client.notes}</Text>
                          </VStack>
                        </Card>
                      )}

                      {primary && (
                        <Card>
                          <VStack gap={2}>
                            <Text type="label" color="secondary">
                              Primary contact
                            </Text>
                            <HStack gap={2} vAlign="center">
                              <Avatar name={primary.name} size="md" tooltip={false} />
                              <VStack gap={0}>
                                <Text type="body" weight="semibold">
                                  {primary.name}
                                </Text>
                                <Text type="supporting" color="secondary">
                                  {primary.title}
                                </Text>
                              </VStack>
                            </HStack>
                          </VStack>
                        </Card>
                      )}
                    </VStack>
                  </Grid>
                </VStack>
              );
            }}
          </DataView>
        </LayoutContent>
      }
    />
  );
}
