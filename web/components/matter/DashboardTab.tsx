"use client";

/**
 * The matter dashboard: the case file first, then who is on the file, what
 * has been checked for conflicts, and what has happened lately.
 *
 * The money used to lead. It now sits in the page header as a compact strip
 * (FinancialStrip) that stays on screen whatever tab is open, and the
 * dashboard belongs to what the matter is about -- the question a lawyer
 * preparing for a hearing opens it to answer.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useMemberName, useOrg } from "@/lib/org";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  type ConflictHit,
  type ConflictResult,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { Panel, lines, useWrite, type TabProps } from "./shared";
import { MatterTypeBadge } from "@/components/Distinction";
import { CaseFile } from "./CaseFile";
import { ParentLine, PrimaryBadge } from "./SubCases";

const CONFLICT_VARIANT: Record<ConflictResult, "success" | "warn" | "danger"> = {
  clear: "success",
  potential_conflict: "warn",
  conflict: "danger",
};

export function DashboardTab({ data, reload, onError }: TabProps) {
  const { formatDate, formatDateTime, formatEGP } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const memberName = useMemberName();
  const { matter } = data;
  // Only the budget line still needs a currency here.
  const currency = data.invoices[0]?.currency ?? "EGP";

  const openTasks = data.tasks.filter((task) => task.status !== "done");
  const billRecipient = data.contacts.find((c) => c.is_bill_recipient);

  return (
    <div className="flex flex-col gap-6">
      {/* --- the case file proper: what this matter is about ------------ */}
      <CaseFile data={data} reload={reload} onError={onError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* --- details ---------------------------------------------- */}
          <Panel title={t("@legalos.matterWorkspace.details.heading")}>
            <p className="text-xs m-0 leading-relaxed" style={{ color: "var(--text)" }}>
              {matter.description ||
                t("@legalos.matterWorkspace.details.noDescription")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex flex-col gap-1">
                <span style={{ color: "var(--text3)" }}>
                  {t("@legalos.matterWorkspace.details.matterNumber")}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {matter.matter_number}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span style={{ color: "var(--text3)" }}>
                  {t("@legalos.matters.field.type")}
                </span>
                <div>
                  <MatterTypeBadge type={matter.matter_type} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span style={{ color: "var(--text3)" }}>
                  {t("@legalos.matters.field.responsible")}
                </span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {memberName(matter.responsible_user)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span style={{ color: "var(--text3)" }}>
                  {t("@legalos.matters.field.billing")}
                </span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {enumLabel(matter.billing_type)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span style={{ color: "var(--text3)" }}>
                  {t("@legalos.matters.field.opened")}
                </span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {formatDate(matter.opened_date)}
                </span>
              </div>
              {matter.budget_amount !== null && (
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.detail.glance.budget")}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text)" }}>
                    {formatEGP(Number(matter.budget_amount), currency)}
                    {matter.budget_is_estimate
                      ? ` ${t("@legalos.matters.detail.glance.estimateSuffix")}`
                      : ""}
                  </span>
                </div>
              )}
              {matter.closed_date && (
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.field.closed")}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text)" }}>
                    {formatDate(matter.closed_date)}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span style={{ color: "var(--text3)" }}>
                  {t("@legalos.matterWorkspace.details.tags")}
                </span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {matter.tags.length > 0
                    ? matter.tags.join(", ")
                    : t("@legalos.matterWorkspace.details.noTags")}
                </span>
              </div>
            </div>
          </Panel>

          {data.linkedCase && (
            <Panel
              title={t("@legalos.matters.detail.linkedCase.heading")}
              action={
                <div className="flex items-center gap-3">
                  <PrimaryBadge record={data.linkedCase} />
                  <Link
                    href={`/cases/${data.linkedCase.id}`}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {t("@legalos.matters.detail.linkedCase.openCase")}
                  </Link>
                </div>
              }
            >
              <ParentLine record={data.linkedCase} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.detail.linkedCase.caseNumber")}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text)" }}>
                    {data.linkedCase.case_number}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.detail.linkedCase.court")}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text)" }}>
                    {data.linkedCase.court}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.detail.linkedCase.opposingParty")}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text)" }}>
                    {data.linkedCase.opposing_party || "—"}
                  </span>
                </div>
              </div>
            </Panel>
          )}

          <ConflictChecksCard data={data} reload={reload} onError={onError} />

          <Panel title={t("@legalos.matters.detail.openTasks.heading")}>
            {openTasks.length === 0 ? (
              <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
                {t("@legalos.matters.detail.openTasks.empty")}
              </p>
            ) : (
              <div
                className="flex flex-col rounded-md border divide-y overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {openTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="check_circle" size={16} style={{ color: "var(--text3)" }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                          {task.title}
                        </span>
                        <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                          {memberName(task.assignee)}
                        </span>
                      </div>
                    </div>
                    {task.due_date && (
                      <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t("@legalos.matters.detail.activity.heading")}>
            {data.activity.length === 0 ? (
              <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
                {t("@legalos.matters.detail.activity.empty")}
              </p>
            ) : (
              <div
                className="flex flex-col rounded-md border divide-y overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {data.activity.map((entry) => {
                  const actorName = memberName(entry.actor);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          title={actorName}
                          className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
                          style={{
                            backgroundColor: "var(--surface3)",
                            borderColor: "var(--border)",
                            color: "var(--text2)",
                          }}
                        >
                          {actorName ? actorName.slice(0, 2).toUpperCase() : "?"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                            {actorName}
                          </span>
                          <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                            {entry.action}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                        {formatDateTime(entry.occurred_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <ContactsCard data={data} reload={reload} onError={onError} />

          <Panel title={t("@legalos.matters.detail.team.heading")}>
            <div
              className="flex flex-col rounded-md border divide-y overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {(() => {
                const leadName = memberName(matter.responsible_user);
                return (
                  <div className="flex items-center gap-2.5 p-3">
                    <div
                      title={leadName}
                      className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
                      style={{
                        backgroundColor: "var(--surface3)",
                        borderColor: "var(--border)",
                        color: "var(--text2)",
                      }}
                    >
                      {leadName ? leadName.slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                        {leadName}
                      </span>
                      <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                        {t("@legalos.matters.field.responsible")}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {matter.staff.map((userId) => {
                const staffName = memberName(userId);
                return (
                  <div key={userId} className="flex items-center gap-2.5 p-3">
                    <div
                      title={staffName}
                      className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
                      style={{
                        backgroundColor: "var(--surface3)",
                        borderColor: "var(--border)",
                        color: "var(--text2)",
                      }}
                    >
                      {staffName ? staffName.slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                        {staffName}
                      </span>
                      <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                        {t("@legalos.matters.detail.team.supporting")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title={t("@legalos.matters.detail.hearings.heading")}>
            {data.hearings.length === 0 ? (
              <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
                {t("@legalos.matters.detail.hearings.empty")}
              </p>
            ) : (
              <div
                className="flex flex-col rounded-md border divide-y overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {data.hearings.map((hearing) => (
                  <div
                    key={hearing.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="gavel" size={16} style={{ color: "var(--text3)" }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                          {hearing.purpose ||
                            t("@legalos.matters.detail.hearings.defaultPurpose")}
                        </span>
                        <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                          {hearing.court}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>
                      {formatDate(hearing.hearing_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {billRecipient && (
            <Panel title={t("@legalos.matterWorkspace.contacts.billRecipient")}>
              <div className="flex items-center gap-3">
                <Icon name="payments" size={18} style={{ color: "var(--text3)" }} />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {billRecipient.name}
                  </span>
                  {billRecipient.email && (
                    <span className="text-xs" style={{ color: "var(--text3)" }}>
                      {billRecipient.email}
                    </span>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// --- contacts ---------------------------------------------------------------

function ContactsCard({ data, reload, onError }: TabProps) {
  const t = useTranslator();
  const write = useWrite(reload, onError);
  const { practice } = useOrg();
  const [isAdding, setIsAdding] = useState(false);

  const clientParties = data.contacts.filter((c) => c.contact_id !== null);
  const otherParties = data.contacts.filter((c) => c.contact_id === null);

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.contacts.heading")}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            {t("@legalos.matterWorkspace.contacts.add")}
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
            {t("@legalos.matterWorkspace.contacts.clients", {
              count: clientParties.length,
            })}
          </span>
          <div
            className="flex flex-col rounded-md border divide-y overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  title={data.matter.client_name}
                  className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
                  style={{
                    backgroundColor: "var(--surface3)",
                    borderColor: "var(--border)",
                    color: "var(--text2)",
                  }}
                >
                  {data.matter.client_name ? data.matter.client_name.slice(0, 2).toUpperCase() : "?"}
                </div>
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/clients/${data.matter.client_id}`}
                    className="text-xs font-semibold hover:underline truncate"
                    style={{ color: "var(--primary)" }}
                  >
                    {data.matter.client_name}
                  </Link>
                  <span className="text-xs" style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.field.client")}
                  </span>
                </div>
              </div>
            </div>
            {clientParties.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                matterId={data.matter.id}
                write={write}
                practiceReady={Boolean(practice)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
            {t("@legalos.matterWorkspace.contacts.related", {
              count: otherParties.length,
            })}
          </span>
          {otherParties.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.matterWorkspace.contacts.empty")}
            </span>
          ) : (
            <div
              className="flex flex-col rounded-md border divide-y overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {otherParties.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  matterId={data.matter.id}
                  write={write}
                  practiceReady={Boolean(practice)}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      <AddContactDialog
        isOpen={isAdding}
        onOpenChange={setIsAdding}
        data={data}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function ContactRow({
  contact,
  matterId,
  write,
  practiceReady,
}: {
  contact: import("@/lib/practice").MatterContact;
  matterId: number;
  write: ReturnType<typeof useWrite>;
  practiceReady: boolean;
}) {
  const t = useTranslator();
  const { practice } = useOrg();

  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          title={contact.name}
          className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
          style={{
            backgroundColor: "var(--surface3)",
            borderColor: "var(--border)",
            color: "var(--text2)",
          }}
        >
          {contact.name ? contact.name.slice(0, 2).toUpperCase() : "?"}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
            {contact.name}
          </span>
          {(contact.relationship || contact.email) && (
            <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
              {contact.relationship || contact.email}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {contact.is_bill_recipient ? (
          <Badge color="info" variant="soft">
            {t("@legalos.matterWorkspace.contacts.billRecipient")}
          </Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={!practiceReady}
            startIcon={<Icon name="payments" size={16} />}
            aria-label={t("@legalos.matterWorkspace.contacts.makeBillRecipient")}
            onClick={() =>
              write(
                () =>
                  practice!.matters.updateContact(matterId, contact.id, {
                    is_bill_recipient: true,
                  }),
                "@legalos.matterWorkspace.errors.contact",
              )
            }
          >
            {t("@legalos.matterWorkspace.contacts.makeBillRecipient")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={!practiceReady}
          startIcon={<Icon name="delete" size={16} />}
          aria-label={t("@legalos.matterWorkspace.contacts.remove")}
          onClick={() =>
            write(
              () => practice!.matters.removeContact(matterId, contact.id),
              "@legalos.matterWorkspace.errors.contact",
            )
          }
        >
          {t("@legalos.matterWorkspace.contacts.remove")}
        </Button>
      </div>
    </div>
  );
}

function AddContactDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: TabProps["data"];
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [mode, setMode] = useState<"existing" | "external">("existing");
  const [contactId, setContactId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Contacts already attached cannot be attached again, so they are not offered.
  const attached = new Set(
    data.contacts.map((c) => c.contact_id).filter((id): id is number => id !== null),
  );
  const available = data.clientContacts.filter((c) => !attached.has(c.id));

  function reset() {
    setMode("existing");
    setContactId(null);
    setName("");
    setRelationship("");
    setEmail("");
    setPhone("");
  }

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.matters.addContact(data.matter.id, {
          ...(mode === "existing"
            ? { contact_id: Number(contactId) }
            : { name: name.trim(), email, phone }),
          relationship,
        }),
      "@legalos.matterWorkspace.errors.contact",
    );
    setSaving(false);
    if (ok) {
      reset();
      onOpenChange(false);
    }
  }

  const canSubmit =
    mode === "existing" ? contactId !== null : name.trim().length > 0;

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.contacts.form.heading")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label={t("@legalos.matterWorkspace.contacts.form.heading")}
            className="inline-flex p-1 border max-w-fit"
            style={{
              backgroundColor: "var(--surface2)",
              borderColor: "var(--border)",
              borderRadius: "var(--rs)",
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "existing"}
              onClick={() => setMode("existing")}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderRadius: "calc(var(--rs) - 2px)",
                backgroundColor: mode === "existing" ? "var(--surface)" : "transparent",
                color: mode === "existing" ? "var(--text)" : "var(--text2)",
                boxShadow: mode === "existing" ? "var(--shadow)" : "none",
              }}
            >
              {t("@legalos.matterWorkspace.contacts.form.existing")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "external"}
              onClick={() => setMode("external")}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderRadius: "calc(var(--rs) - 2px)",
                backgroundColor: mode === "external" ? "var(--surface)" : "transparent",
                color: mode === "external" ? "var(--text)" : "var(--text2)",
                boxShadow: mode === "external" ? "var(--shadow)" : "none",
              }}
            >
              {t("@legalos.matterWorkspace.contacts.form.external")}
            </button>
          </div>

          {mode === "existing" ? (
            available.length === 0 ? (
              <span className="text-xs" style={{ color: "var(--text3)" }}>
                {t("@legalos.matterWorkspace.contacts.form.noneOnFile")}
              </span>
            ) : (
              <Select
                label={t("@legalos.matterWorkspace.contacts.form.pick")}
                value={contactId ?? ""}
                onChange={(e) => setContactId(e.target.value || null)}
                options={[
                  { value: "", label: "—" },
                  ...available.map((c) => ({
                    value: String(c.id),
                    label: c.title ? `${c.name} — ${c.title}` : c.name,
                  })),
                ]}
              />
            )
          ) : (
            <>
              <Input
                label={t("@legalos.matterWorkspace.contacts.form.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                label={t("@legalos.matterWorkspace.contacts.form.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="tel"
                label={t("@legalos.matterWorkspace.contacts.form.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </>
          )}

          <Input
            label={t("@legalos.matterWorkspace.contacts.form.relationship")}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder={t(
              "@legalos.matterWorkspace.contacts.form.relationshipPlaceholder",
            )}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!canSubmit}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.add")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// --- conflict checks --------------------------------------------------------

function ConflictChecksCard({ data, reload, onError }: TabProps) {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [isRunning, setIsRunning] = useState(false);
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  // The hits behind the most recent run, which the API returns but does not
  // store — only their summary is persisted.
  const [hits, setHits] = useState<ConflictHit[] | null>(null);

  async function run() {
    if (!practice) return;
    setBusy(true);
    try {
      const result = await practice.matters.runConflictCheck(
        data.matter.id,
        lines(terms),
      );
      setHits(result.hits);
      setTerms("");
      setIsRunning(false);
      reload();
    } catch (exc) {
      onError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matterWorkspace.errors.conflict"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.conflicts.heading")}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsRunning(true)}
          >
            {t("@legalos.matterWorkspace.conflicts.run")}
          </Button>
        }
      >
        {data.conflictChecks.length === 0 ? (
          <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
            {t("@legalos.matterWorkspace.conflicts.empty")}
          </p>
        ) : (
          <div
            className="flex flex-col rounded-md border divide-y overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {data.conflictChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="verified_user" size={16} style={{ color: "var(--text3)" }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                      {check.search_terms.join(", ")}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {check.hit_summary ||
                        t("@legalos.matterWorkspace.conflicts.noHits")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <Badge
                      color={CONFLICT_VARIANT[check.result]}
                      variant="soft"
                    >
                      {t(
                        `@legalos.matterWorkspace.conflicts.result.${check.result}`,
                      )}
                    </Badge>
                    <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                      {check.cleared_by
                        ? t("@legalos.matterWorkspace.conflicts.clearedBy", {
                            name: memberName(check.cleared_by),
                            date: formatDate(check.cleared_at),
                          })
                        : t("@legalos.matterWorkspace.conflicts.ranBy", {
                            name: memberName(check.run_by),
                            date: formatDate(check.run_at),
                          })}
                    </span>
                  </div>

                  {!check.cleared_by && (
                    <div className="w-36">
                      <Select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            write(
                              () =>
                                practice!.conflicts.resolve(check.id, {
                                  result: val as ConflictResult,
                                }),
                              "@legalos.matterWorkspace.errors.conflict",
                            );
                          }
                        }}
                        options={[
                          { value: "", label: t("@legalos.matterWorkspace.conflicts.decide") },
                          { value: "clear", label: t("@legalos.matterWorkspace.conflicts.result.clear") },
                          { value: "potential_conflict", label: t("@legalos.matterWorkspace.conflicts.result.potential_conflict") },
                          { value: "conflict", label: t("@legalos.matterWorkspace.conflicts.result.conflict") },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hits && hits.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
              {t("@legalos.matterWorkspace.conflicts.hits", { count: hits.length })}
            </span>
            <div
              className="flex flex-col rounded-md border divide-y overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {hits.map((hit, index) => (
                <div
                  key={`${hit.kind}-${hit.name}-${index}`}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                      {hit.name}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {hit.matter_name ? `${hit.detail} · ${hit.matter_name}` : hit.detail}
                    </span>
                  </div>
                  <Badge color="neutral" variant="soft">
                    {t(
                      `@legalos.matterWorkspace.conflicts.hitKind.${hit.kind}`,
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Dialog isOpen={isRunning} onOpenChange={setIsRunning} width={480}>
        <DialogHeader
          title={t("@legalos.matterWorkspace.conflicts.run")}
          onOpenChange={setIsRunning}
        />
        <DialogContent>
          <div className="flex flex-col gap-3">
            <Textarea
              label={t("@legalos.matterWorkspace.conflicts.terms.label")}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={4}
              placeholder={t(
                "@legalos.matterWorkspace.conflicts.terms.placeholder",
              )}
            />
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.matterWorkspace.conflicts.terms.hint")}
            </span>
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.matterWorkspace.conflicts.decideHint")}
            </span>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setIsRunning(false)}
          >
            {t("@legalos.matterWorkspace.action.cancel")}
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={lines(terms).length === 0}
            onClick={run}
          >
            {t("@legalos.matterWorkspace.conflicts.run")}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
