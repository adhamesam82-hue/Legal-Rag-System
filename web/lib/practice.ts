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
export type MatterType =
  | "litigation"
  | "corporate"
  | "tax"
  | "labour"
  | "family_probate"
  | "contract_review";
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

export interface Hearing {
  id: number;
  matter_id: number;
  hearing_date: string;
  hearing_time: string;
  court: string;
  purpose: string;
  outcome: string | null;
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
}

export interface Invoice {
  id: number;
  organization_id: number;
  matter_id: number | null;
  matter_name: string | null;
  client_id: number;
  client_name: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
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
      list: (filters: { matter_id?: number; since?: string; until?: string } = {}) =>
        request<Hearing[]>(`${base}/hearings${query(filters)}`),
      create: (body: Record<string, unknown>) => post<Hearing>("/hearings", body),
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
        return request<MatterDocument>(
          `${base}/documents${query(options)}`,
          // Content-Type is omitted deliberately: the browser must set the
          // multipart boundary itself.
          { method: "POST", body: form, headers: { "content-type": "" } },
        );
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
      remove: (id: number) => remove(`/invoices/${id}`),
    },

    activity: (filters: { matter_id?: number; client_id?: number; limit?: number } = {}) =>
      request<ActivityEntry[]>(`${base}/activity${query(filters)}`),
  };
}

export type PracticeApi = ReturnType<typeof practiceApi>;

// --- display helpers --------------------------------------------------------
// The API speaks lowercase enum values; these are the labels shown on screen.

const LABELS: Record<string, string> = {
  company: "Company",
  individual: "Individual",
  active: "Active",
  inactive: "Inactive",
  on_hold: "On Hold",
  closed: "Closed",
  litigation: "Litigation",
  corporate: "Corporate",
  tax: "Tax",
  labour: "Labour",
  family_probate: "Family / Probate",
  contract_review: "Contract Review",
  hourly: "Hourly",
  fixed_fee: "Fixed Fee",
  retainer: "Retainer",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  low: "Low",
  medium: "Medium",
  high: "High",
  draft: "Draft",
  under_review: "Under review",
  signed: "Signed",
  filed: "Filed",
  final: "Final",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  us: "Us",
  opposing_party: "Opposing party",
  court: "Court",
  owner: "Owner",
  lawyer: "Lawyer",
  staff: "Staff",
  milestone: "Milestone",
  communication: "Communication",
  billing: "Billing",
  hearing: "Hearing",
  task: "Task",
  deadline: "Deadline",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return LABELS[value] ?? value;
}

export function formatEGP(amount: number | null | undefined, currency = "EGP"): string {
  if (amount === null || amount === undefined) return "—";
  return `${currency} ${Number(amount).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
