"use client";

import { useMemo, useState } from "react";
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
  const enumLabel = useEnumLabel();
  const { practice, organizationName } = useOrg();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);

  // Clients, their matter counts and their latest activity come from three
  // endpoints; the table joins them client-side rather than adding a bespoke
  // rollup route for one screen.
  const resource = useResource(
    async (api) => {
      const [clients, matters, activity] = await Promise.all([
        api.clients.list({
          status: statusFilter === "all" ? undefined : statusFilter,
          q: query.trim() || undefined,
        }),
        api.matters.list({ status: "active" }),
        api.activity({ limit: 200 }),
      ]);
      return { clients, matters, activity };
    },
    [query, statusFilter],
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
      header: "Client",
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
      header: "Type",
      width: pixel(120),
      renderCell: (row) => <Text type="body">{enumLabel(row.client_type)}</Text>,
    },
    {
      key: "primaryContactName",
      header: "Primary contact",
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
      header: "Active matters",
      width: pixel(130),
      renderCell: (row) =>
        row.activeMatters > 0 ? (
          <Text type="body">{row.activeMatters}</Text>
        ) : (
          <Text type="body" color="secondary">
            None
          </Text>
        ),
    },
    {
      key: "lastActivity",
      header: "Last activity",
      width: pixel(140),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {formatDate(row.lastActivity)}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: pixel(110),
      renderCell: (row) =>
        row.status === "inactive" ? (
          <Badge variant="neutral" label="Inactive" />
        ) : (
          <Text type="body" color="secondary">
            Active
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
                  <Heading level={2}>Clients</Heading>
                  <Text type="body" color="secondary">
                    {total} {total === 1 ? "client" : "clients"}
                    {organizationName ? ` at ${organizationName}` : ""}
                  </Text>
                </VStack>
                <Button
                  label="New client"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  New client
                </Button>
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label="Search clients"
                  isLabelHidden
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by name or industry"
                  startIcon={MagnifyingGlassIcon}
                  width={320}
                />
                <Selector
                  label="Type"
                  isLabelHidden
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v ?? "all")}
                  options={[
                    { value: "all", label: "All types" },
                    { value: "company", label: "Company" },
                    { value: "individual", label: "Individual" },
                  ]}
                  width={160}
                />
                <Selector
                  label="Status"
                  isLabelHidden
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v ?? "all")}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  width={160}
                />
              </HStack>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={0}>
            <DataView resource={resource} loadingLabel="Loading clients…">
              {() =>
                rows.length > 0 ? (
                  <Table<ClientRow> data={rows} columns={columns} idKey="id" hasHover />
                ) : (
                  <EmptyState
                    icon={<Icon icon={UserGroupIcon} size="lg" color="secondary" />}
                    title={
                      total === 0
                        ? "No clients yet"
                        : "No clients match your filters"
                    }
                    description={
                      total === 0
                        ? "Add your first client to start opening matters against it."
                        : "Try a different search term or clear the type and status filters."
                    }
                    actions={
                      total === 0 ? (
                        <Button
                          label="New client"
                          variant="primary"
                          onClick={() => setIsCreating(true)}
                        />
                      ) : (
                        <Button
                          label="Clear filters"
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
      setError(exc instanceof Error ? exc.message : "Could not save this client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title="New client" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label="Client name"
                value={name}
                onChange={setName}
                placeholder="Nile Trading Co."
                isRequired
              />
              <Selector
                label="Type"
                value={clientType}
                onChange={(v) => setClientType((v as ClientType) ?? "company")}
                options={[
                  { value: "company", label: "Company" },
                  { value: "individual", label: "Individual" },
                ]}
              />
              <TextInput
                label="Industry"
                value={industry}
                onChange={setIndustry}
                placeholder="Import & Export Trading"
              />
              <HStack gap={3}>
                <TextInput label="Email" value={email} onChange={setEmail} />
                <TextInput label="Phone" value={phone} onChange={setPhone} />
              </HStack>
              <TextInput label="Address" value={address} onChange={setAddress} />
              <TextArea label="Notes" value={notes} onChange={setNotes} rows={3} />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label="Cancel"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? "Saving…" : "Create client"}
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
