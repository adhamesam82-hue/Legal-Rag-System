"use client";

/**
 * Shared shape and small building blocks for the matter workspace tabs.
 *
 * The workspace loads once, into one object, and every tab reads from it.
 * Loading per tab would be fewer requests on first paint but would make the
 * financial strip disagree with the Activities tab whenever one had refetched
 * and the other had not — on a single matter the volumes are small enough that
 * one consistent snapshot is worth more than the saved round trips.
 */

import React, { useCallback } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import type {
  ActivityEntry,
  CaseRecord,
  ClientPortal,
  Communication,
  ConflictCheck,
  Contact,
  CustomFieldValue,
  Expense,
  Hearing,
  Invoice,
  Matter,
  MatterContact,
  MatterDocument,
  MatterTimelineEvent,
  Note,
  SecureThread,
  Task,
  TimeEntry,
  TrustAccount,
  TrustBalance,
  TrustTransaction,
} from "@/lib/practice";

export interface WorkspaceData {
  matter: Matter;
  /** null when the matter holds no litigation case, which is not an error. */
  linkedCase: CaseRecord | null;
  contacts: MatterContact[];
  /** The client's own contacts — the pool a matter contact or portal invite draws from. */
  clientContacts: Contact[];
  customFields: CustomFieldValue[];
  conflictChecks: ConflictCheck[];
  documents: MatterDocument[];
  tasks: Task[];
  time: TimeEntry[];
  expenses: Expense[];
  invoices: Invoice[];
  notes: Note[];
  timeline: MatterTimelineEvent[];
  hearings: Hearing[];
  activity: ActivityEntry[];
  trustBalance: TrustBalance;
  trustTransactions: TrustTransaction[];
  trustAccounts: TrustAccount[];
  communications: Communication[];
  threads: SecureThread[];
  portals: ClientPortal[];
}

export interface TabProps {
  data: WorkspaceData;
  /** Refetches the whole workspace; call after any write. */
  reload: () => void;
  onError: (message: string) => void;
}

/** Money on this matter, and where it currently sits. */
export interface Financials {
  unbilledTime: number;
  unbilledExpenses: number;
  workInProgress: number;
  outstanding: number;
  overdue: number;
  clientFunds: number;
  totalHours: number;
  currency: string;
}

export function financialsOf(data: WorkspaceData): Financials {
  const unbilledTime = data.time
    .filter((t) => t.billable && t.invoice_id === null)
    .reduce((sum, t) => sum + Number(t.hours) * Number(t.rate), 0);
  const unbilledExpenses = data.expenses
    .filter((e) => e.billable && e.invoice_id === null)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  // Drafts are not owed by anyone yet — only what has actually been sent.
  const outstanding = data.invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const overdue = data.invoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return {
    unbilledTime,
    unbilledExpenses,
    workInProgress: unbilledTime + unbilledExpenses,
    outstanding,
    overdue,
    clientFunds: Number(data.trustBalance.balance),
    totalHours: data.time.reduce((sum, t) => sum + Number(t.hours), 0),
    currency: data.invoices[0]?.currency ?? "EGP",
  };
}

/** A titled card with an optional action in its header — the workspace's unit. */
export function Panel({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4">
        {(title || action) && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {title ? (
              <h3 className="text-sm font-bold m-0" style={{ color: "var(--text)" }}>
                {title}
              </h3>
            ) : (
              <span />
            )}
            {action}
          </div>
        )}
        {children}
      </div>
    </Card>
  );
}

/** One figure in the financial strip: a label, an amount, and its breakdown. */
export function StatTile({
  label,
  value,
  hint,
  breakdown,
  action,
}: {
  label: string;
  value: string;
  hint?: string;
  breakdown?: { label: string; value: string }[];
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
        {label}
      </span>
      <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
        {value}
      </div>
      {hint && (
        <span className="text-xs" style={{ color: "var(--text3)" }}>
          {hint}
        </span>
      )}
      {breakdown && breakdown.length > 0 && (
        <div className="flex flex-col gap-1 w-full mt-1">
          {breakdown.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-xs gap-3"
              style={{ color: "var(--text2)" }}
            >
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {action}
    </div>
  );
}

/**
 * Turns a write into a handler that reports its failure through the page's
 * error banner rather than dropping it. Every mutating control in the
 * workspace goes through this, so none of them can fail silently.
 */
export function useWrite(reload: () => void, onError: (message: string) => void) {
  const t = useTranslator();
  return useCallback(
    async (action: () => Promise<unknown>, fallbackKey: string) => {
      try {
        await action();
        reload();
        return true;
      } catch (exc) {
        onError(exc instanceof Error ? exc.message : t(fallbackKey));
        return false;
      }
    },
    [reload, onError, t],
  );
}

/** Splits `text` on newlines into trimmed, non-empty lines. */
export function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
