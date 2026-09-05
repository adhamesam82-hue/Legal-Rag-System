"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  type Client,
  type ClientType,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";

interface ClientRow extends Record<string, unknown> {
  id: number;
  name: string;
  client_type: ClientType;
  industry: string;
  status: string;
  primaryContactName: string;
  primaryContactTitle: string;
  activeMatters: number;
  lastActivity: string | null;
}

export default function ClientsPage() {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice, organizationName } = useOrg();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  /** The name of the client just created, for the confirmation banner. */
  const [created, setCreated] = useState<string | null>(null);

  // The search box drives a server-side filter, so the input keeps its own
  // state and only the settled value reaches the fetch -- typing "Al-Sayed"
  // otherwise fired eight rounds of three requests, each round's results
  // arriving after the letter that made them obsolete.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Clients, their matter counts and their latest activity come from three
  // endpoints; the table joins them client-side rather than adding a bespoke
  // rollup route for one screen.
  const resource = useResource(
    async (api) => {
      const [clients, matters, activity] = await Promise.all([
        api.clients.list({
          status: statusFilter === "all" ? undefined : statusFilter,
          q: debouncedQuery || undefined,
        }),
        api.matters.list({ status: "active" }),
        api.activity({ limit: 200 }),
      ]);
      return { clients, matters, activity };
    },
    [debouncedQuery, statusFilter],
  );

  const rows = useMemo<ClientRow[]>(() => {
    if (!resource.data) return [];
    const { clients, matters, activity } = resource.data;
    return clients
      .filter((c) => typeFilter === "all" || c.client_type === typeFilter)
      .map((client) => {
        const primary =
          client.contacts.find((c) => c.is_primary) ?? client.contacts[0];
        const latest = activity
          .filter((a) => a.client_id === client.id)
          .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))[0];
        return {
          id: client.id,
          name: client.name,
          client_type: client.client_type,
          industry: client.industry,
          status: client.status,
          primaryContactName: primary?.name ?? "—",
          primaryContactTitle: primary?.title ?? "",
          activeMatters: matters.filter((m) => m.client_id === client.id).length,
          lastActivity: latest?.occurred_at ?? client.client_since,
        };
      });
  }, [resource.data, typeFilter]);

  const total = resource.data?.clients.length ?? 0;

  return (
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      {/* رأس الصفحة وحقل الإجراءات */}
      <header
        className="flex flex-col gap-4 pb-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-9 h-9"
                style={{
                  borderRadius: "var(--rs)",
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                <Icon name="groups" size={20} />
              </div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--text)" }}
              >
                {t("@legalos.clients.heading")}
              </h1>
            </div>
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {organizationName
                ? t("@legalos.clients.subtitle.atFirm", {
                    count: total,
                    firm: organizationName,
                  })
                : t("@legalos.clients.subtitle.plain", { count: total })}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreating(true)}
            disabled={!practice}
            startIcon={<Icon name="person_add" size={16} />}
          >
            {t("@legalos.clients.newClient")}
          </Button>
        </div>

        {/* شريط البحث والتصفية المتعددة */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-72">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("@legalos.clients.search.placeholder")}
              aria-label={t("@legalos.clients.search.label")}
              startIcon={<Icon name="search" size={18} />}
            />
          </div>
          <div className="w-44">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label={t("@legalos.clients.table.type")}
              options={[
                { value: "all", label: t("@legalos.clients.filter.allTypes") },
                { value: "company", label: enumLabel("company") },
                { value: "individual", label: enumLabel("individual") },
              ]}
            />
          </div>
          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t("@legalos.clients.table.status")}
              options={[
                { value: "all", label: t("@legalos.clients.filter.allStatuses") },
                { value: "active", label: enumLabel("active") },
                { value: "inactive", label: enumLabel("inactive") },
              ]}
            />
          </div>
        </div>
      </header>

      {/* رسالة تأكيد إنشاء عميل */}
      {created && (
        <Alert
          type="success"
          title={t("@legalos.clients.created", { name: created })}
          onClose={() => setCreated(null)}
        />
      )}

      {/* منطقة عرض البيانات والجدول */}
      <DataView resource={resource} loadingLabel={t("@legalos.clients.loading")}>
        {() =>
          rows.length > 0 ? (
            <Card padding={0} bordered shadow className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ minWidth: "220px" }}>{t("@legalos.clients.table.client")}</TableHead>
                    <TableHead style={{ minWidth: "120px" }}>{t("@legalos.clients.table.type")}</TableHead>
                    <TableHead style={{ minWidth: "200px" }}>{t("@legalos.clients.table.primaryContact")}</TableHead>
                    <TableHead style={{ minWidth: "120px" }}>{t("@legalos.clients.table.activeMatters")}</TableHead>
                    <TableHead style={{ minWidth: "130px" }}>{t("@legalos.clients.table.lastActivity")}</TableHead>
                    <TableHead style={{ minWidth: "100px" }}>{t("@legalos.clients.table.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <NextLink
                          href={`/clients/${row.id}`}
                          className="flex flex-col gap-0.5 group focus-visible:outline-2 focus-visible:outline-[var(--primary)] rounded"
                          style={{ textDecoration: "none" }}
                        >
                          <span
                            className="font-semibold text-sm group-hover:underline"
                            style={{ color: "var(--primary)" }}
                          >
                            {row.name}
                          </span>
                          {row.industry && (
                            <span className="text-xs" style={{ color: "var(--text3)" }}>
                              {row.industry}
                            </span>
                          )}
                        </NextLink>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                          {enumLabel(row.client_type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                            style={{
                              backgroundColor: "var(--surface3)",
                              color: "var(--text2)",
                            }}
                          >
                            {row.primaryContactName.charAt(0)}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                              {row.primaryContactName}
                            </span>
                            {row.primaryContactTitle && (
                              <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                                {row.primaryContactTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.activeMatters > 0 ? (
                          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                            {row.activeMatters}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text3)" }}>
                            {t("@legalos.clients.table.noneActive")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>
                          {formatDate(row.lastActivity)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.status === "inactive" ? (
                          <Badge color="neutral" variant="soft">
                            {enumLabel("inactive")}
                          </Badge>
                        ) : (
                          <Badge color="success" variant="soft">
                            {enumLabel("active")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState
              icon={<Icon name="groups" size={32} />}
              title={
                total === 0
                  ? t("@legalos.clients.empty.noneTitle")
                  : t("@legalos.clients.empty.noMatchTitle")
              }
              description={
                total === 0
                  ? t("@legalos.clients.empty.noneDescription")
                  : t("@legalos.clients.empty.noMatchDescription")
              }
              action={
                total === 0 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCreating(true)}
                  >
                    {t("@legalos.clients.newClient")}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    {t("@legalos.clients.clearFilters")}
                  </Button>
                )
              }
            />
          )
        }
      </DataView>

      <NewClientDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={(name) => {
          setCreated(name);
          resource.reload();
        }}
      />
    </div>
  );
}

function NewClientDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the new client's name, so the page can confirm what it saved. */
  onCreated: (name: string) => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice } = useOrg();
  const [name, setName] = useState("");
  const [clientType, setClientType] = useState<ClientType>("company");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setClientType("company");
    setIndustry("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNotes("");
    setError(null);
  }

  async function submit() {
    if (!practice || !name.trim()) return;
    setSaving(true);
    setError(null);
    const createdName = name.trim();
    try {
      await practice.clients.create({
        name: createdName,
        client_type: clientType,
        industry,
        email,
        phone,
        address,
        notes: notes || null,
      } as Partial<Client>);
      reset();
      onOpenChange(false);
      onCreated(createdName);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.clients.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={520}>
      <DialogHeader
        title={t("@legalos.clients.dialog.title")}
        onOpenChange={onOpenChange}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DialogContent>
          <InlineError message={error} onDismiss={() => setError(null)} />
          <Input
            label={t("@legalos.clients.dialog.nameLabel")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="شركة النيل للتجارة"
            required
          />
          <Select
            label={t("@legalos.clients.dialog.typeLabel")}
            value={clientType}
            onChange={(e) => setClientType((e.target.value as ClientType) ?? "company")}
            options={[
              { value: "company", label: enumLabel("company") },
              { value: "individual", label: enumLabel("individual") },
            ]}
          />
          <Input
            label={t("@legalos.clients.dialog.industryLabel")}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder={t("@legalos.clients.dialog.industryPlaceholder")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="email"
              label={t("@legalos.clients.dialog.emailLabel")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="tel"
              label={t("@legalos.clients.dialog.phoneLabel")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Input
            label={t("@legalos.clients.dialog.addressLabel")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
              {t("@legalos.clients.dialog.notesLabel")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{
                borderRadius: "var(--rs)",
                backgroundColor: "var(--surface2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("@legalos.clients.dialog.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={saving || !name.trim()}
          >
            {saving
              ? t("@legalos.clients.dialog.saving")
              : t("@legalos.clients.dialog.create")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
