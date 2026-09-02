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
} from "@heroicons/react/24/outline";
import { useMemberName, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import {
  InvoiceStatusMark,
  MatterStatusMark,
  MatterTypeIcon,
} from "@/components/Distinction";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { formatDate, formatDateTime, formatEGP } = useFormat();
  const { id } = use(params);
  const t = useTranslator();
  const clientId = Number(id);
  const enumLabel = useEnumLabel();
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
          <DataView resource={resource} loadingLabel={t("@legalos.clients.detail.loading")}>
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
                        {t("@legalos.clients.detail.backLink")}
                      </Text>
                    </HStack>
                  </Link>

                  <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                    <VStack gap={1}>
                      <HStack gap={3} vAlign="center">
                        <Heading level={2}>{client.name}</Heading>
                        {client.status === "inactive" && (
                          <Badge variant="neutral" label={enumLabel("inactive")} />
                        )}
                      </HStack>
                      <Text type="body" color="secondary">
                        {enumLabel(client.client_type)}
                        {client.industry ? ` · ${client.industry}` : ""}
                        {client.client_since
                          ? t("@legalos.clients.detail.clientSince", { date: formatDate(client.client_since) })
                          : ""}
                      </Text>
                    </VStack>
                  </HStack>

                  <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          {t("@legalos.clients.detail.stat.activeMatters")}
                        </Text>
                        <Text size="2xl" weight="semibold">
                          {matters.filter((m) => m.status === "active").length}
                        </Text>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          {t("@legalos.clients.detail.stat.totalMatters")}
                        </Text>
                        <Text size="2xl" weight="semibold">{matters.length}</Text>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          {t("@legalos.clients.detail.stat.outstanding")}
                        </Text>
                        <Text size="2xl" weight="semibold">{formatEGP(outstanding)}</Text>
                      </VStack>
                    </Card>
                  </Grid>

                  <Grid columns={3} gap={6}>
                    <GridSpan columns={2}>
                      <VStack gap={6}>
                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>{t("@legalos.clients.detail.matters.heading")}</Heading>
                            {matters.length === 0 ? (
                              <EmptyState
                                icon={
                                  <Icon
                                    icon={BriefcaseIcon}
                                    size="lg"
                                    color="secondary"
                                  />
                                }
                                title={t("@legalos.clients.detail.matters.emptyTitle")}
                                description={t("@legalos.clients.detail.matters.emptyDescription")}
                              />
                            ) : (
                              <List hasDividers density="compact">
                                {matters.map((matter) => (
                                  <ListItem
                                    key={matter.id}
                                    label={matter.name}
                                    href={`/matters/${matter.id}`}
                                    description={`${enumLabel(matter.matter_type)} · ${memberName(
                                      matter.responsible_user,
                                    )}`}
                                    // The type's glyph on its hue leads the
                                    // row; the type name is in the description
                                    // beside it, so the colour never stands
                                    // alone.
                                    startContent={<MatterTypeIcon type={matter.matter_type} />}
                                    endContent={<MatterStatusMark status={matter.status} />}
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>

                        <Card>
                          <VStack gap={4}>
                            <HStack hAlign="between" vAlign="center">
                              <Heading level={4}>{t("@legalos.clients.detail.invoices.heading")}</Heading>
                              <Link href="/billing">{t("@legalos.clients.detail.invoices.billingLink")}</Link>
                            </HStack>
                            {invoices.length === 0 ? (
                              <Text type="body" color="secondary">
                                {t("@legalos.clients.detail.invoices.empty")}
                              </Text>
                            ) : (
                              <List hasDividers density="compact">
                                {invoices.map((invoice) => (
                                  <ListItem
                                    key={invoice.id}
                                    label={invoice.number}
                                    href={`/billing/${invoice.id}`}
                                    description={t("@legalos.clients.detail.invoiceDates", {
                                      issued: formatDate(invoice.issued_date),
                                      due: formatDate(invoice.due_date),
                                    })}
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
                                        <InvoiceStatusMark status={invoice.status} />
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
                            <Heading level={4}>{t("@legalos.clients.detail.activity.heading")}</Heading>
                            {activity.length === 0 ? (
                              <Text type="body" color="secondary">
                                {t("@legalos.clients.detail.activity.empty")}
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
                          <Heading level={4}>{t("@legalos.clients.detail.details.heading")}</Heading>
                          <MetadataList>
                            <MetadataListItem label={t("@legalos.clients.detail.field.type")}>
                              {enumLabel(client.client_type)}
                            </MetadataListItem>
                            {client.registration_number && (
                              <MetadataListItem label={t("@legalos.clients.detail.field.registration")}>
                                {client.registration_number}
                              </MetadataListItem>
                            )}
                            {client.tax_id && (
                              <MetadataListItem label={t("@legalos.clients.detail.field.taxId")}>
                                {client.tax_id}
                              </MetadataListItem>
                            )}
                            {client.address && (
                              <MetadataListItem label={t("@legalos.clients.detail.field.address")}>
                                {client.address}
                              </MetadataListItem>
                            )}
                            {client.phone && (
                              <MetadataListItem label={t("@legalos.clients.detail.field.phone")}>
                                {client.phone}
                              </MetadataListItem>
                            )}
                            {client.email && (
                              <MetadataListItem label={t("@legalos.clients.detail.field.email")}>
                                {client.email}
                              </MetadataListItem>
                            )}
                          </MetadataList>
                        </VStack>
                      </Card>

                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>{t("@legalos.clients.detail.contacts.heading")}</Heading>
                          {client.contacts.length === 0 ? (
                            <Text type="body" color="secondary">
                              {t("@legalos.clients.detail.contacts.empty")}
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {client.contacts.map((contact) => (
                                <ListItem
                                  key={contact.id}
                                  label={contact.name}
                                  // Role, email and phone on one truncated line
                                  // in a 312px rail cut the phone number in
                                  // half, which is the part somebody is
                                  // reading this card to get. Wrapping keeps
                                  // all three whole.
                                  description={
                                    <Text type="supporting" color="secondary" maxLines={3}>
                                      {[contact.title, contact.email, contact.phone]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </Text>
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
                                      <Badge variant="info" label={t("@legalos.clients.detail.contacts.primaryBadge")} />
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
                            <Heading level={4}>{t("@legalos.clients.detail.notes.heading")}</Heading>
                            <Text type="body">{client.notes}</Text>
                          </VStack>
                        </Card>
                      )}

                      {primary && (
                        <Card>
                          <VStack gap={2}>
                            <Text type="label" color="secondary">
                              {t("@legalos.clients.detail.contacts.primaryHeading")}
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
