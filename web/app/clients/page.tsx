"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { PlusIcon, MagnifyingGlassIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  formatDate,
  type Client,
  type ClientType,
} from "@/lib/practice";
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
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice, organizationName } = useOrg();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);

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

  const columns: TableColumn<ClientRow>[] = [
    {
      key: "name",
      header: t("@legalos.clients.table.client"),
      width: proportional(2.5),
      renderCell: (row) => (
        <Link href={`/clients/${row.id}`}>
          <VStack gap={0}>
            <Text type="body" weight="semibold">
              {row.name}
            </Text>
            <Text type="supporting" color="secondary">
              {row.industry}
            </Text>
          </VStack>
        </Link>
      ),
    },
    {
      key: "client_type",
      header: t("@legalos.clients.table.type"),
      width: pixel(120),
      renderCell: (row) => <Text type="body">{enumLabel(row.client_type)}</Text>,
    },
    {
      key: "primaryContactName",
      header: t("@legalos.clients.table.primaryContact"),
      width: proportional(1.6),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Avatar name={row.primaryContactName} size="sm" tooltip={false} />
          <VStack gap={0}>
            <Text type="body">{row.primaryContactName}</Text>
            {row.primaryContactTitle && (
              <Text type="supporting" color="secondary">
                {row.primaryContactTitle}
              </Text>
            )}
          </VStack>
        </HStack>
      ),
    },
    {
      key: "activeMatters",
      header: t("@legalos.clients.table.activeMatters"),
      width: pixel(130),
      renderCell: (row) =>
        row.activeMatters > 0 ? (
          <Text type="body">{row.activeMatters}</Text>
        ) : (
          <Text type="body" color="secondary">
            {t("@legalos.clients.table.noneActive")}
          </Text>
        ),
    },
    {
      key: "lastActivity",
      header: t("@legalos.clients.table.lastActivity"),
      width: pixel(140),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {formatDate(row.lastActivity)}
        </Text>
      ),
    },
    {
      key: "status",
      header: t("@legalos.clients.table.status"),
      width: pixel(110),
      renderCell: (row) =>
        row.status === "inactive" ? (
          <Badge variant="neutral" label={enumLabel("inactive")} />
        ) : (
          <Text type="body" color="secondary">
            {enumLabel("active")}
          </Text>
        ),
    },
  ];

  const total = resource.data?.clients.length ?? 0;

  return (
    <>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={0}>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center">
                <VStack gap={1}>
                  <Heading level={2}>{t("@legalos.clients.heading")}</Heading>
                  <Text type="body" color="secondary">
                    {organizationName
                      ? t("@legalos.clients.subtitle.atFirm", {
                          count: total,
                          firm: organizationName,
                        })
                      : t("@legalos.clients.subtitle.plain", { count: total })}
                  </Text>
                </VStack>
                <Button
                  label={t("@legalos.clients.newClient")}
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  {t("@legalos.clients.newClient")}
                </Button>
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={t("@legalos.clients.search.label")}
                  isLabelHidden
                  value={query}
                  onChange={setQuery}
                  placeholder={t("@legalos.clients.search.placeholder")}
                  startIcon={MagnifyingGlassIcon}
                  width={320}
                />
                <Selector
                  label={t("@legalos.clients.table.type")}
                  isLabelHidden
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v ?? "all")}
                  options={[
                    { value: "all", label: t("@legalos.clients.filter.allTypes") },
                    { value: "company", label: enumLabel("company") },
                    { value: "individual", label: enumLabel("individual") },
                  ]}
                  width={160}
                />
                <Selector
                  label={t("@legalos.clients.table.status")}
                  isLabelHidden
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v ?? "all")}
                  options={[
                    { value: "all", label: t("@legalos.clients.filter.allStatuses") },
                    { value: "active", label: enumLabel("active") },
                    { value: "inactive", label: enumLabel("inactive") },
                  ]}
                  width={160}
                />
              </HStack>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={0}>
            <DataView resource={resource} loadingLabel={t("@legalos.clients.loading")}>
              {() =>
                rows.length > 0 ? (
                  <Table<ClientRow> data={rows} columns={columns} idKey="id" hasHover />
                ) : (
                  <EmptyState
                    icon={<Icon icon={UserGroupIcon} size="lg" color="secondary" />}
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
                    actions={
                      total === 0 ? (
                        <Button
                          label={t("@legalos.clients.newClient")}
                          variant="primary"
                          onClick={() => setIsCreating(true)}
                        />
                      ) : (
                        <Button
                          label={t("@legalos.clients.clearFilters")}
                          variant="secondary"
                          onClick={() => {
                            setQuery("");
                            setTypeFilter("all");
                            setStatusFilter("all");
                          }}
                        />
                      )
                    }
                  />
                )
              }
            </DataView>
          </LayoutContent>
        }
      />
      <NewClientDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={resource.reload}
      />
    </>
  );
}

function NewClientDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
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
    try {
      await practice.clients.create({
        name: name.trim(),
        client_type: clientType,
        industry,
        email,
        phone,
        address,
        notes: notes || null,
      } as Partial<Client>);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.clients.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title={t("@legalos.clients.dialog.title")} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label={t("@legalos.clients.dialog.nameLabel")}
                value={name}
                onChange={setName}
                placeholder="Nile Trading Co."
                isRequired
              />
              <Selector
                label={t("@legalos.clients.dialog.typeLabel")}
                value={clientType}
                onChange={(v) => setClientType((v as ClientType) ?? "company")}
                options={[
                  { value: "company", label: enumLabel("company") },
                  { value: "individual", label: enumLabel("individual") },
                ]}
              />
              <TextInput
                label={t("@legalos.clients.dialog.industryLabel")}
                value={industry}
                onChange={setIndustry}
                placeholder={t("@legalos.clients.dialog.industryPlaceholder")}
              />
              <HStack gap={3}>
                <TextInput label={t("@legalos.clients.dialog.emailLabel")} value={email} onChange={setEmail} />
                <TextInput label={t("@legalos.clients.dialog.phoneLabel")} value={phone} onChange={setPhone} />
              </HStack>
              <TextInput label={t("@legalos.clients.dialog.addressLabel")} value={address} onChange={setAddress} />
              <TextArea label={t("@legalos.clients.dialog.notesLabel")} value={notes} onChange={setNotes} rows={3} />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.clients.dialog.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? t("@legalos.clients.dialog.saving") : t("@legalos.clients.dialog.create")}
                variant="primary"
                onClick={submit}
                isDisabled={saving || !name.trim()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
