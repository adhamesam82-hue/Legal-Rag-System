"use client";

/**
 * Client detail page (T-053 / Wave 5).
 *
 * Shows client details, contacts, active matters, invoices, and recent activity.
 * Preserves all hooks, contract layer calls, and state intact.
 */

import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
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
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      <DataView resource={resource} loadingLabel={t("@legalos.clients.detail.loading")}>
        {({ client, matters, invoices, activity }) => {
          const outstanding = invoices
            .filter((i) => i.status === "sent" || i.status === "overdue")
            .reduce((sum, i) => sum + Number(i.amount), 0);
          const primary =
            client.contacts.find((c) => c.is_primary) ?? client.contacts[0];

          return (
            <div className="flex flex-col gap-6">
              {/* Back link */}
              <div>
                <Link
                  href="/clients"
                  className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  style={{ color: "var(--text2)" }}
                >
                  <Icon name="arrow_back" size={18} />
                  <span>{t("@legalos.clients.detail.backLink")}</span>
                </Link>
              </div>

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                      {client.name}
                    </h1>
                    {client.status === "inactive" && (
                      <Badge color="neutral">{enumLabel("inactive")}</Badge>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    {enumLabel(client.client_type)}
                    {client.industry ? ` · ${client.industry}` : ""}
                    {client.client_since
                      ? t("@legalos.clients.detail.clientSince", { date: formatDate(client.client_since) })
                      : ""}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                      {t("@legalos.clients.detail.stat.activeMatters")}
                    </span>
                    <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {matters.filter((m) => m.status === "active").length}
                    </span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                      {t("@legalos.clients.detail.stat.totalMatters")}
                    </span>
                    <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {matters.length}
                    </span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                      {t("@legalos.clients.detail.stat.outstanding")}
                    </span>
                    <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {formatEGP(outstanding)}
                    </span>
                  </div>
                </Card>
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 columns: Matters, Invoices, Activity */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Matters list */}
                  <Card className="p-5 flex flex-col gap-4">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.clients.detail.matters.heading")}
                    </h2>
                    {matters.length === 0 ? (
                      <EmptyState
                        icon={<Icon name="work" size={32} />}
                        title={t("@legalos.clients.detail.matters.emptyTitle")}
                        description={t("@legalos.clients.detail.matters.emptyDescription")}
                      />
                    ) : (
                      <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                        {matters.map((matter) => (
                          <div key={matter.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <MatterTypeIcon type={matter.matter_type} />
                              <div className="flex flex-col min-w-0">
                                <Link
                                  href={`/matters/${matter.id}`}
                                  className="text-sm font-medium hover:underline truncate"
                                  style={{ color: "var(--text)" }}
                                >
                                  {matter.name}
                                </Link>
                                <span className="text-xs truncate" style={{ color: "var(--text2)" }}>
                                  {enumLabel(matter.matter_type)} · {memberName(matter.responsible_user)}
                                </span>
                              </div>
                            </div>
                            <MatterStatusMark status={matter.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Invoices list */}
                  <Card className="p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                        {t("@legalos.clients.detail.invoices.heading")}
                      </h2>
                      <Link
                        href="/billing"
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {t("@legalos.clients.detail.invoices.billingLink")}
                      </Link>
                    </div>
                    {invoices.length === 0 ? (
                      <p className="text-sm py-4" style={{ color: "var(--text2)" }}>
                        {t("@legalos.clients.detail.invoices.empty")}
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                        {invoices.map((invoice) => (
                          <div key={invoice.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center"
                                style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
                              >
                                <Icon name="receipt" size={18} />
                              </div>
                              <div className="flex flex-col">
                                <Link
                                  href={`/billing/${invoice.id}`}
                                  className="text-sm font-medium hover:underline"
                                  style={{ color: "var(--text)" }}
                                >
                                  {invoice.number}
                                </Link>
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {t("@legalos.clients.detail.invoiceDates", {
                                    issued: formatDate(invoice.issued_date),
                                    due: formatDate(invoice.due_date),
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                                {formatEGP(Number(invoice.amount), invoice.currency)}
                              </span>
                              <InvoiceStatusMark status={invoice.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Activity log */}
                  <Card className="p-5 flex flex-col gap-4">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.clients.detail.activity.heading")}
                    </h2>
                    {activity.length === 0 ? (
                      <p className="text-sm py-4" style={{ color: "var(--text2)" }}>
                        {t("@legalos.clients.detail.activity.empty")}
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                        {activity.map((entry) => (
                          <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                style={{ backgroundColor: "var(--primary-soft)", color: "var(--primary)" }}
                              >
                                {memberName(entry.actor).slice(0, 2)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                                  {memberName(entry.actor)}
                                </span>
                                <span className="text-xs truncate" style={{ color: "var(--text2)" }}>
                                  {entry.action}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                              {formatDateTime(entry.occurred_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Right column: Details, Contacts, Notes */}
                <div className="flex flex-col gap-6">
                  {/* Metadata */}
                  <Card className="p-5 flex flex-col gap-4">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.clients.detail.details.heading")}
                    </h2>
                    <dl className="flex flex-col gap-2.5 text-sm">
                      <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                        <dt style={{ color: "var(--text2)" }}>{t("@legalos.clients.detail.field.type")}</dt>
                        <dd className="font-medium" style={{ color: "var(--text)" }}>{enumLabel(client.client_type)}</dd>
                      </div>
                      {client.registration_number && (
                        <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.clients.detail.field.registration")}</dt>
                          <dd className="font-medium" style={{ color: "var(--text)" }}>{client.registration_number}</dd>
                        </div>
                      )}
                      {client.tax_id && (
                        <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.clients.detail.field.taxId")}</dt>
                          <dd className="font-medium" style={{ color: "var(--text)" }}>{client.tax_id}</dd>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.clients.detail.field.address")}</dt>
                          <dd className="font-medium" style={{ color: "var(--text)" }}>{client.address}</dd>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.clients.detail.field.phone")}</dt>
                          <dd className="font-medium" style={{ color: "var(--text)" }}>{client.phone}</dd>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex justify-between py-1" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.clients.detail.field.email")}</dt>
                          <dd className="font-medium" style={{ color: "var(--text)" }}>{client.email}</dd>
                        </div>
                      )}
                    </dl>
                  </Card>

                  {/* Contacts */}
                  <Card className="p-5 flex flex-col gap-4">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.clients.detail.contacts.heading")}
                    </h2>
                    {client.contacts.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--text2)" }}>
                        {t("@legalos.clients.detail.contacts.empty")}
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                        {client.contacts.map((contact) => (
                          <div key={contact.id} className="py-2.5 flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
                                style={{ backgroundColor: "var(--surface2)", color: "var(--text)" }}
                              >
                                {contact.name.slice(0, 2)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                                  {contact.name}
                                </span>
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {[contact.title, contact.email, contact.phone]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </div>
                            </div>
                            {contact.is_primary && (
                              <Badge color="info">
                                {t("@legalos.clients.detail.contacts.primaryBadge")}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Notes */}
                  {client.notes && (
                    <Card className="p-5 flex flex-col gap-2">
                      <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                        {t("@legalos.clients.detail.notes.heading")}
                      </h2>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text2)" }}>
                        {client.notes}
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      </DataView>
    </div>
  );
}
