// -----------------------------------------------------------------------------
// Typed client for the practice-management API (clients, matters, cases,
// documents, tasks, time, billing) under /api/orgs/{organizationId}/.
//
// Field names are snake_case because they mirror the API payloads exactly --
// renaming them here would put a translation layer between the network tab and
// the components for no gain.
//
// This replaces lib/legalos-data.ts, which held the same shapes as hard-coded
// sample content before the backend existed.
// -----------------------------------------------------------------------------

import type { ISODateString } from "@astryxdesign/core/Calendar";
import { request } from "@/lib/api";

export type { ISODateString };

export type Role = "owner" | "lawyer" | "staff";
export type ClientType = "company" | "individual";
export type ClientStatus = "active" | "inactive";
/** Mirrors MATTER_TYPES in the API. "legacy_litigation" is read-only: rows
 *  that were "litigation" before migration 0021, awaiting reclassification. */
export type MatterType =
  | "civil"
  | "criminal"
  | "commercial"
  | "corporate"
  | "real_estate"
  | "intellectual_property"
  | "administrative"
  | "family_personal_status"
  | "labour"
  | "tax"
  | "arbitration"
  | "execution"
  | "advisory"
  | "other"
  | "legacy_litigation";
/** The values a matter may be created with -- everything but the legacy marker. */
export const MATTER_TYPES: MatterType[] = [
  "civil",
  "criminal",
  "commercial",
  "corporate",
  "real_estate",
  "intellectual_property",
  "administrative",
  "family_personal_status",
  "labour",
  "tax",
  "arbitration",
  "execution",
  "advisory",
  "other",
];
export type MatterStatus = "active" | "on_hold" | "closed";
export type BillingType = "hourly" | "fixed_fee" | "retainer";
export type TaskStatus = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";
export type DocumentStatus =
  | "draft"
  | "under_review"
  | "signed"
  | "filed"
  | "final";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type SubmittedBy = "us" | "opposing_party" | "court";
export type TimelineKind = "milestone" | "filing" | "communication" | "billing";
export type ExpenseCategory =
  | "court_fees"
  | "filing"
  | "expert"
  | "travel"
  | "translation"
  | "courier"
  | "other";
export type CommunicationChannel = "phone" | "email" | "meeting" | "letter";
export type CommunicationDirection = "incoming" | "outgoing";
export type PortalStatus = "invited" | "active" | "revoked";
export type TrustKind = "deposit" | "withdrawal" | "invoice_payment" | "refund";
export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "checkbox"
  | "select";
export type ConflictResult = "clear" | "potential_conflict" | "conflict";

export interface Contact {
  id: number;
  name: string;
  title: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

export interface Client {
  id: number;
  organization_id: number;
  name: string;
  client_type: ClientType;
  industry: string;
  status: ClientStatus;
  client_since: string | null;
  registration_number: string | null;
  tax_id: string | null;
  address: string;
  phone: string;
  email: string;
  notes: string | null;
  created_at: string;
  contacts: Contact[];
}

export interface Deadline {
  label: string;
  due_date: string;
}

export interface Matter {
  id: number;
  organization_id: number;
  /** Per-firm ordinal the number series is derived from; never rewritten. */
  number_seq: number;
  /** What the matter is quoted by — editable to a firm's own convention. */
  matter_number: string;
  client_id: number;
  client_name: string;
  name: string;
  matter_type: MatterType;
  status: MatterStatus;
  responsible_user: string;
  opened_date: string;
  closed_date: string | null;
  description: string;
  billing_type: BillingType;
  budget_amount: number | null;
  budget_is_estimate: boolean;
  tags: string[];
  created_at: string;
  staff: string[];
  case_id: number | null;
  next_deadline: Deadline | null;
}

export interface CaseTimelineEvent {
  id: number;
  event_date: string;
  label: string;
  detail: string | null;
}

export interface CaseDeadline {
  id: number;
  label: string;
  due_date: string;
  completed: boolean;
}

export interface Evidence {
  id: number;
  name: string;
  evidence_type: string;
  submitted_by: SubmittedBy;
  submitted_date: string;
}

export interface CourtDocument {
  id: number;
  name: string;
  doc_type: string;
  doc_date: string;
}

export type HearingOutcome =
  | "adjourned"
  | "reserved"
  | "judgment"
  | "struck_out"
  | "joined"
  | "other";

export const HEARING_OUTCOMES: HearingOutcome[] = [
  "adjourned",
  "reserved",
  "judgment",
  "struck_out",
  "joined",
  "other",
];

export interface Hearing {
  id: number;
  matter_id: number;
  matter_name: string | null;
  hearing_date: string;
  hearing_time: string;
  court: string;
  /** The دائرة, from the linked case; null when the matter has no case yet. */
  judge: string | null;
  purpose: string;
  /** null while the sitting has not happened yet -- not an error state. */
  outcome: HearingOutcome | null;
  /** What the bench said, in the clerk's words. The code says adjourned; only
   *  this says what it was adjourned for. */
  outcome_note: string | null;
  next_hearing_date: string | null;
}

/** Enough of a related case to name it and link to it. */
export interface CaseRef {
  id: number;
  case_number: string;
  court: string;
  litigation_degree: string;
}

export interface CaseRecord {
  id: number;
  organization_id: number;
  matter_id: number;
  matter_name: string;
  court: string;
  judge: string;
  case_number: string;
  status: string;
  opposing_party: string;
  opposing_counsel: string | null;
  filed_date: string;
  ai_summary: string | null;
  created_at: string;
  /** The case file proper (migration 0022). Empty strings, never null. */
  summary: string;
  facts: string;
  legal_basis: string;
  defences: string;
  procedural_posture: string;
  client_narrative: string;
  /** The same dispute before another court, one level deep. */
  parent_case_id: number | null;
  parent: CaseRef | null;
  children: CaseRef[];
  timeline: CaseTimelineEvent[];
  deadlines: CaseDeadline[];
  evidence: Evidence[];
  court_documents: CourtDocument[];
  next_hearing: Hearing | null;
}

export interface MatterDocument {
  id: number;
  organization_id: number;
  matter_id: number | null;
  matter_name: string | null;
  name: string;
  doc_type: string;
  status: DocumentStatus;
  size_bytes: number;
  content_type: string;
  storage_key: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Task {
  id: number;
  organization_id: number;
  matter_id: number | null;
  matter_name: string | null;
  title: string;
  assignee: string;
  due_date: string | null;
  status: TaskStatus;
  priority: Priority;
  created_at: string;
  completed_at: string | null;
}

export interface TimeEntry {
  id: number;
  organization_id: number;
  matter_id: number;
  matter_name: string;
  clerk_user_id: string;
  entry_date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate: number;
  currency: string;
  invoice_id: number | null;
  created_at: string;
}

export interface TimeSummary {
  total_hours: number;
  billable_hours: number;
  billable_amount: number;
  unbilled_amount: number;
}

export interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  unit_amount: number;
  line_total: number;
  /** Per-line tax since migration 0024; 0 when the invoice is taxed as a whole. */
  tax_rate: number;
  tax_amount: number;
}

export interface Invoice {
  id: number;
  organization_id: number;
  matter_id: number | null;
  matter_name: string | null;
  client_id: number;
  client_name: string;
  client_tax_id: string | null;
  number: string;
  /** Sum of the lines, before tax. */
  amount: number;
  /** Input when the invoice is taxed as a whole; derived (tax / amount) when lines carry their own rates. */
  tax_rate: number;
  tax_amount: number;
  /** What the client owes. */
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
  /** Printed under the totals. Editable on drafts only. */
  notes: string;
  lines: InvoiceLine[];
}

export interface BillingSummary {
  outstanding: number;
  overdue: number;
  paid_this_year: number;
  draft_count: number;
}

export interface Note {
  id: number;
  matter_id: number;
  author: string;
  content: string;
  created_at: string;
}

export interface MatterTimelineEvent {
  id: number;
  matter_id: number;
  event_date: string;
  label: string;
  detail: string | null;
  kind: TimelineKind;
}

export interface ActivityEntry {
  id: number;
  matter_id: number | null;
  matter_name: string | null;
  client_id: number | null;
  client_name: string | null;
  actor: string;
  action: string;
  occurred_at: string;
}

export interface MatterContact {
  id: number;
  matter_id: number;
  /** Set when this is a contact on file at a client; null for an outside party. */
  contact_id: number | null;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  is_bill_recipient: boolean;
  created_at: string;
  client_id: number | null;
  client_name: string | null;
}

export interface Expense {
  id: number;
  organization_id: number;
  matter_id: number;
  matter_name: string;
  clerk_user_id: string;
  entry_date: string;
  description: string;
  category: ExpenseCategory;
  quantity: number;
  unit_amount: number;
  /** Derived by the database from quantity × unit_amount; read-only. */
  amount: number;
  billable: boolean;
  currency: string;
  invoice_id: number | null;
  created_at: string;
}

export interface ExpenseSummary {
  total_amount: number;
  billable_amount: number;
  unbilled_amount: number;
}

export interface Communication {
  id: number;
  organization_id: number;
  matter_id: number | null;
  matter_name: string | null;
  client_id: number | null;
  client_name: string | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string;
  body: string;
  counterparty: string;
  logged_by: string;
  occurred_at: string;
  duration_minutes: number | null;
  created_at: string;
}

export interface ClientPortal {
  id: number;
  organization_id: number;
  matter_id: number;
  matter_name: string;
  contact_id: number;
  contact_name: string;
  contact_email: string;
  status: PortalStatus;
  can_view_documents: boolean;
  can_view_bills: boolean;
  can_message: boolean;
  invited_by: string;
  invited_at: string;
  activated_at: string | null;
  revoked_at: string | null;
  last_active_at: string | null;
}

export interface SecureMessage {
  id: number;
  thread_id: number;
  author_kind: "firm" | "client";
  /** Clerk id when the firm wrote it; resolve through useMemberName(). */
  author_user: string | null;
  author_contact_id: number | null;
  /** The client contact's name; empty for firm-authored messages. */
  author_name: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

export interface SecureThread {
  id: number;
  organization_id: number;
  matter_id: number;
  portal_id: number | null;
  subject: string;
  created_by: string;
  created_at: string;
  last_message_at: string;
  contact_name: string | null;
  message_count: number;
  unread_count: number;
  messages: SecureMessage[];
}

export interface TrustAccount {
  id: number;
  organization_id: number;
  name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  is_default: boolean;
  created_at: string;
}

export interface TrustTransaction {
  id: number;
  organization_id: number;
  trust_account_id: number;
  account_name: string;
  matter_id: number;
  matter_name: string;
  client_id: number;
  client_name: string;
  kind: TrustKind;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  invoice_id: number | null;
  invoice_number: string | null;
  transaction_date: string;
  recorded_by: string;
  created_at: string;
}

export interface TrustBalance {
  matter_id: number | null;
  balance: number;
  deposits: number;
  disbursed: number;
}

export interface CustomFieldDefinition {
  id: number;
  organization_id: number;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
  display_order: number;
  /** null applies the field to every matter type. */
  matter_type: MatterType | null;
  created_at: string;
}

/** A definition paired with this matter's value, which may be unset. */
export interface CustomFieldValue {
  definition_id: number;
  matter_id: number;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
  display_order: number;
  value: string | null;
  updated_at: string | null;
}

export interface ConflictCheck {
  id: number;
  organization_id: number;
  matter_id: number;
  search_terms: string[];
  result: ConflictResult;
  hit_summary: string;
  notes: string;
  run_by: string;
  run_at: string;
  cleared_by: string | null;
  cleared_at: string | null;
}

export interface ConflictHit {
  kind: "client" | "matter_party" | "opposing_party" | "opposing_counsel";
  name: string;
  matched_term: string;
  matter_id: number | null;
  matter_name: string | null;
  detail: string;
}

/** A run returns both the stored record and the hits behind its summary. */
export interface ConflictCheckRun {
  check: ConflictCheck;
  hits: ConflictHit[];
}

export interface UpcomingItem {
  kind: "hearing" | "task" | "deadline";
  label: string;
  due_date: string;
  matter_id: number | null;
  matter_name: string | null;
}

export interface Dashboard {
  active_matters: number;
  open_tasks: number;
  overdue_tasks: number;
  active_clients: number;
  unbilled_amount: number;
  outstanding_amount: number;
  hours_this_month: number;
  upcoming: UpcomingItem[];
  recent_activity: ActivityEntry[];
}

export interface Me {
  clerk_user_id: string;
  organization_id: number;
  role: Role;
  display_name: string | null;
  title: string | null;
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

/** All practice calls for one organization. Pages get this from useOrg(). */
export function practiceApi(organizationId: number) {
  const base = `/api/orgs/${organizationId}`;
  const post = <T,>(path: string, body: unknown) =>
    request<T>(`${base}${path}`, { method: "POST", body: JSON.stringify(body) });
  const patch = <T,>(path: string, body: unknown) =>
    request<T>(`${base}${path}`, { method: "PATCH", body: JSON.stringify(body) });
  const remove = (path: string) =>
    request<void>(`${base}${path}`, { method: "DELETE" });

  return {
    me: () => request<Me>(`${base}/me`),
    dashboard: (upcomingDays = 30) =>
      request<Dashboard>(`${base}/dashboard${query({ upcoming_days: upcomingDays })}`),

    clients: {
      list: (filters: { status?: string; q?: string } = {}) =>
        request<Client[]>(`${base}/clients${query(filters)}`),
      get: (id: number) => request<Client>(`${base}/clients/${id}`),
      create: (body: Partial<Client>) => post<Client>("/clients", body),
      update: (id: number, body: Partial<Client>) =>
        patch<Client>(`/clients/${id}`, body),
      remove: (id: number) => remove(`/clients/${id}`),
      addContact: (id: number, body: Partial<Contact>) =>
        post<Contact>(`/clients/${id}/contacts`, body),
      removeContact: (id: number, contactId: number) =>
        remove(`/clients/${id}/contacts/${contactId}`),
    },

    matters: {
      list: (
        filters: {
          status?: string;
          client_id?: number;
          responsible_user?: string;
          matter_type?: string;
          q?: string;
        } = {},
      ) => request<Matter[]>(`${base}/matters${query(filters)}`),
      get: (id: number) => request<Matter>(`${base}/matters/${id}`),
      create: (body: Record<string, unknown>) => post<Matter>("/matters", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<Matter>(`/matters/${id}`, body),
      remove: (id: number) => remove(`/matters/${id}`),
      notes: (id: number) => request<Note[]>(`${base}/matters/${id}/notes`),
      addNote: (id: number, content: string) =>
        post<Note>(`/matters/${id}/notes`, { content }),
      timeline: (id: number) =>
        request<MatterTimelineEvent[]>(`${base}/matters/${id}/timeline`),
      addTimelineEvent: (id: number, body: Record<string, unknown>) =>
        post<MatterTimelineEvent>(`/matters/${id}/timeline`, body),
      /** 404s when the matter holds no litigation case; callers treat that as "none". */
      case: (id: number) => request<CaseRecord>(`${base}/matters/${id}/case`),

      contacts: (id: number) =>
        request<MatterContact[]>(`${base}/matters/${id}/contacts`),
      addContact: (id: number, body: Partial<MatterContact>) =>
        post<MatterContact>(`/matters/${id}/contacts`, body),
      updateContact: (
        id: number,
        contactRowId: number,
        body: Partial<MatterContact>,
      ) => patch<MatterContact>(`/matters/${id}/contacts/${contactRowId}`, body),
      removeContact: (id: number, contactRowId: number) =>
        remove(`/matters/${id}/contacts/${contactRowId}`),

      /** Copies the engagement's shape onto a new number; carries no work over. */
      duplicate: (id: number, body: { name?: string; opened_date?: string } = {}) =>
        post<Matter>(`/matters/${id}/duplicate`, body),

      customFields: (id: number) =>
        request<CustomFieldValue[]>(`${base}/matters/${id}/custom-fields`),
      /** An empty or null value clears the field. */
      setCustomField: (id: number, definitionId: number, value: string | null) =>
        request<CustomFieldValue>(
          `${base}/matters/${id}/custom-fields/${definitionId}`,
          { method: "PUT", body: JSON.stringify({ value }) },
        ),

      conflictChecks: (id: number) =>
        request<ConflictCheck[]>(`${base}/matters/${id}/conflict-checks`),
      runConflictCheck: (id: number, terms: string[], notes = "") =>
        post<ConflictCheckRun>(`/matters/${id}/conflict-checks`, { terms, notes }),

      trustBalance: (id: number) =>
        request<TrustBalance>(`${base}/matters/${id}/trust-balance`),

      portals: (id: number) =>
        request<ClientPortal[]>(`${base}/portals${query({ matter_id: id })}`),
      invitePortal: (id: number, body: Record<string, unknown>) =>
        post<ClientPortal>(`/matters/${id}/portals`, body),

      threads: (id: number) =>
        request<SecureThread[]>(`${base}/matters/${id}/threads`),
      startThread: (
        id: number,
        body: { subject: string; body: string; portal_id?: number },
      ) => post<SecureThread>(`/matters/${id}/threads`, body),
    },

    expenses: {
      list: (
        filters: {
          matter_id?: number;
          clerk_user_id?: string;
          since?: string;
          until?: string;
          unbilled_only?: boolean;
        } = {},
      ) => request<Expense[]>(`${base}/expenses${query(filters)}`),
      summary: (filters: { matter_id?: number; since?: string; until?: string } = {}) =>
        request<ExpenseSummary>(`${base}/expenses/summary${query(filters)}`),
      create: (body: Record<string, unknown>) => post<Expense>("/expenses", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<Expense>(`/expenses/${id}`, body),
      remove: (id: number) => remove(`/expenses/${id}`),
    },

    communications: {
      list: (
        filters: {
          matter_id?: number;
          client_id?: number;
          channel?: string;
          direction?: string;
          since?: string;
          until?: string;
          q?: string;
          limit?: number;
        } = {},
      ) => request<Communication[]>(`${base}/communications${query(filters)}`),
      log: (body: Record<string, unknown>) =>
        post<Communication>("/communications", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<Communication>(`/communications/${id}`, body),
      remove: (id: number) => remove(`/communications/${id}`),
    },

    portals: {
      list: (filters: { matter_id?: number; status?: string } = {}) =>
        request<ClientPortal[]>(`${base}/portals${query(filters)}`),
      update: (id: number, body: Record<string, unknown>) =>
        patch<ClientPortal>(`/portals/${id}`, body),
      reply: (threadId: number, body: string) =>
        post<SecureMessage>(`/threads/${threadId}/messages`, { body }),
      markRead: (threadId: number) =>
        post<void>(`/threads/${threadId}/read`, {}),
    },

    trust: {
      accounts: () => request<TrustAccount[]>(`${base}/trust-accounts`),
      createAccount: (body: Record<string, unknown>) =>
        post<TrustAccount>("/trust-accounts", body),
      transactions: (
        filters: {
          matter_id?: number;
          client_id?: number;
          trust_account_id?: number;
          since?: string;
          until?: string;
        } = {},
      ) => request<TrustTransaction[]>(`${base}/trust-transactions${query(filters)}`),
      record: (body: Record<string, unknown>) =>
        post<TrustTransaction>("/trust-transactions", body),
    },

    customFields: {
      list: (filters: { matter_type?: string } = {}) =>
        request<CustomFieldDefinition[]>(`${base}/custom-fields${query(filters)}`),
      create: (body: Record<string, unknown>) =>
        post<CustomFieldDefinition>("/custom-fields", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<CustomFieldDefinition>(`/custom-fields/${id}`, body),
      remove: (id: number) => remove(`/custom-fields/${id}`),
    },

    conflicts: {
      resolve: (
        checkId: number,
        body: { result: ConflictResult; notes?: string },
      ) => post<ConflictCheck>(`/conflict-checks/${checkId}/resolve`, body),
    },

    cases: {
      list: () => request<CaseRecord[]>(`${base}/cases`),
      get: (id: number) => request<CaseRecord>(`${base}/cases/${id}`),
      create: (body: Record<string, unknown>) => post<CaseRecord>("/cases", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<CaseRecord>(`/cases/${id}`, body),
      addTimelineEvent: (id: number, body: Record<string, unknown>) =>
        post<CaseTimelineEvent>(`/cases/${id}/timeline`, body),
      addDeadline: (id: number, body: { label: string; due_date: string }) =>
        post<CaseDeadline>(`/cases/${id}/deadlines`, body),
      completeDeadline: (id: number, deadlineId: number) =>
        post<void>(`/cases/${id}/deadlines/${deadlineId}/complete`, {}),
      addEvidence: (id: number, body: Record<string, unknown>) =>
        post<Evidence>(`/cases/${id}/evidence`, body),
      addCourtDocument: (id: number, body: Record<string, unknown>) =>
        post<CourtDocument>(`/cases/${id}/court-documents`, body),
    },

    hearings: {
      list: (
        filters: {
          matter_id?: number;
          since?: string;
          until?: string;
          court?: string;
          judge?: string;
          outcome?: HearingOutcome;
          /** Not an outcome value: "not ruled on yet" is the absence of one. */
          undecided?: boolean;
          q?: string;
        } = {},
      ) => request<Hearing[]>(`${base}/hearings${query(filters)}`),
      get: (id: number) => request<Hearing>(`${base}/hearings/${id}`),
      create: (body: Record<string, unknown>) => post<Hearing>("/hearings", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<Hearing>(`/hearings/${id}`, body),
    },

    documents: {
      list: (filters: { matter_id?: number; status?: string; q?: string } = {}) =>
        request<MatterDocument[]>(`${base}/documents${query(filters)}`),
      get: (id: number) => request<MatterDocument>(`${base}/documents/${id}`),
      update: (id: number, body: Record<string, unknown>) =>
        patch<MatterDocument>(`/documents/${id}`, body),
      remove: (id: number) => remove(`/documents/${id}`),
      /** Multipart upload; the shared request() helper is JSON-only. */
      upload: (
        file: File,
        options: { matter_id?: number; doc_type?: string; status?: string } = {},
      ) => {
        const form = new FormData();
        form.append("file", file);
        // request() detects the FormData body and leaves content-type to the
        // browser so the multipart boundary survives.
        return request<MatterDocument>(`${base}/documents${query(options)}`, {
          method: "POST",
          body: form,
        });
      },
      contentUrl: (id: number) => `${base}/documents/${id}/content`,
    },

    tasks: {
      list: (
        filters: {
          matter_id?: number;
          assignee?: string;
          status?: string;
          due_before?: string;
        } = {},
      ) => request<Task[]>(`${base}/tasks${query(filters)}`),
      create: (body: Record<string, unknown>) => post<Task>("/tasks", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<Task>(`/tasks/${id}`, body),
      remove: (id: number) => remove(`/tasks/${id}`),
    },

    time: {
      list: (
        filters: {
          matter_id?: number;
          clerk_user_id?: string;
          since?: string;
          until?: string;
          unbilled_only?: boolean;
        } = {},
      ) => request<TimeEntry[]>(`${base}/time-entries${query(filters)}`),
      summary: (
        filters: {
          matter_id?: number;
          clerk_user_id?: string;
          since?: string;
          until?: string;
        } = {},
      ) => request<TimeSummary>(`${base}/time-entries/summary${query(filters)}`),
      create: (body: Record<string, unknown>) => post<TimeEntry>("/time-entries", body),
      update: (id: number, body: Record<string, unknown>) =>
        patch<TimeEntry>(`/time-entries/${id}`, body),
      remove: (id: number) => remove(`/time-entries/${id}`),
    },

    invoices: {
      list: (filters: { status?: string; client_id?: number; matter_id?: number } = {}) =>
        request<Invoice[]>(`${base}/invoices${query(filters)}`),
      get: (id: number) => request<Invoice>(`${base}/invoices/${id}`),
      summary: () => request<BillingSummary>(`${base}/invoices/summary`),
      create: (body: Record<string, unknown>) => post<Invoice>("/invoices", body),
      generate: (matterId: number, paymentTermsDays = 30) =>
        post<Invoice>("/invoices/generate", {
          matter_id: matterId,
          payment_terms_days: paymentTermsDays,
        }),
      setStatus: (id: number, status: InvoiceStatus) =>
        patch<Invoice>(`/invoices/${id}`, { status }),
      /** Drafts only; the API answers 409 once the invoice has been sent. */
      setNotes: (id: number, notes: string) => patch<Invoice>(`/invoices/${id}`, { notes }),
      pdfUrl: (id: number, lang: "ar" | "en" = "ar") => `${base}/invoices/${id}/pdf?lang=${lang}`,
      remove: (id: number) => remove(`/invoices/${id}`),
    },

    activity: (filters: { matter_id?: number; client_id?: number; limit?: number } = {}) =>
      request<ActivityEntry[]>(`${base}/activity${query(filters)}`),
  };
}

export type PracticeApi = ReturnType<typeof practiceApi>;

// --- display helpers --------------------------------------------------------
// The API speaks lowercase enum values. Their display labels now live in
// lib/i18n/catalogs/enums.ts and are resolved through useEnumLabel() so they
// translate; the English-only LABELS table that used to sit here is gone.

// formatEGP, formatDate, formatDateTime and formatBytes used to live here,
// pinned to "en-US". They now live in lib/i18n/format.ts and follow the
// active locale; components reach them through useFormat(). What stays here
// is the arithmetic that has no locale in it.

/** Whole days from today to `iso`; negative when the date has passed. */
export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Today as YYYY-MM-DD in local time.
 *  Not toISOString().slice(0,10): that converts to UTC first, so it reports
 *  yesterday for anyone east of Greenwich after midnight -- including Cairo. */
export function todayIso(): ISODateString {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}` as ISODateString;
}

