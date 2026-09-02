import type { MatterType } from "@/lib/practice";
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type Jurisdiction = "EG" | "SA";

export interface Article {
  id: number;
  citation: string;
  instrument_id?: number | null;
  instrument_number: string;
  instrument_year: number;
  instrument_title: string;
  article_number: string;
  text: string;
  score: number;
}

export interface Instrument {
  id: number;
  jurisdiction: string;
  instrument_type: string;
  number: string;
  year: number;
  title: string;
  reference: string;
  article_count: number;
}

export interface AskResponse {
  text: string;
  citations: string[];
  refused: boolean;
  blocked: boolean;
  blocked_citations: string[];
  strategy: string;
  degraded: string[];
  articles: Article[];
}

export interface SearchResponse {
  strategy: string;
  expanded_terms: string | null;
  law_hint: string | null;
  degraded: string[];
  articles: Article[];
}

export interface ArticleDetail {
  article: Article;
  instrument: Instrument | null;
  previous_id: number | null;
  next_id: number | null;
}

export interface Organization {
  id: number;
  name: string;
  /** The firm's own details. Null until somebody fills them in on /settings. */
  registration_number: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  /** Practice areas, from the same list as matter types. Empty until set. */
  specialties: MatterType[];
  // --- migration 0025 (T-027). Nullable unless it has a default.
  governorate: string | null;
  main_court: string | null;
  firm_size: FirmSize | null;
  client_kind: ClientKind | null;
  legal_name: string | null;
  tax_id: string | null;
  bar_number: string | null;
  website: string | null;
  /** A design-system palette name, never a hex. */
  brand_color: BrandColor | null;
  locale: "ar" | "en";
  timezone: string;
  date_format: DateFormat;
  default_currency: string;
  /** null = the built-in INV-{year}-{seq}. Must end with {seq}. */
  invoice_number_pattern: string | null;
  /** A preference that pre-fills new invoices; every invoice keeps its own rate. */
  default_tax_rate: number;
  default_payment_terms_days: number;
  /** Which optional form fields this firm makes mandatory. */
  required_fields: { matter?: string[]; client?: string[] };
}

export const FIRM_SIZES = ["solo", "small", "medium", "large"] as const;
export type FirmSize = (typeof FIRM_SIZES)[number];
export const CLIENT_KINDS = ["individuals", "companies", "mixed"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];
export const BRAND_COLORS = ["blue", "cyan", "green", "orange", "pink", "purple", "red", "teal", "yellow"] as const;
export type BrandColor = (typeof BRAND_COLORS)[number];
export const DATE_FORMATS = ["DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

/** A PATCH body: only the fields present are written; "" clears a nullable text field. */
export type OrganizationUpdate = Partial<Omit<Organization, "id" | "logo_url">>;

export interface Membership {
  organization_id: number;
  organization_name: string;
  role: "owner" | "lawyer" | "staff";
}

export interface Invitation {
  token: string;
  email: string;
  role: "lawyer" | "staff";
  organization_name: string;
  /** The link to open to accept. Always usable, whether or not mail went out. */
  accept_url: string;
  /**
   * False when the firm has no mail provider configured, or the send failed.
   * The invitation itself is still valid -- the owner passes accept_url on
   * themselves. The UI has to say which happened, or an owner waits forever
   * for a colleague who was never told.
   */
  email_sent: boolean;
}

/**
 * One invitation the firm has issued, as its own roster screen lists it.
 *
 * No token: this is the record of who was asked to join, not a way to read
 * somebody else's acceptance link back out of the API.
 */
export interface PendingInvite {
  /** A firm can invite the same address twice, so the address is not a key. */
  id: number;
  email: string;
  role: "lawyer" | "staff";
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
}

export interface InvitationPreview {
  organization_name: string;
  role: "lawyer" | "staff";
  status: "pending" | "accepted" | "expired" | "revoked";
}

export type MatterScope = "all" | "assigned";

export interface OrgMember {
  clerk_user_id: string;
  role: "owner" | "lawyer" | "staff";
  /** Whether they see the whole practice or only the cases they are on. */
  matter_scope: MatterScope;
  /** Firm-side display identity, set on the membership rather than in Clerk. */
  display_name: string | null;
  title: string | null;
}

/** Carries the HTTP status so callers can tell "out of credits" from a real fault. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isCredits() {
    return this.status === 402;
  }
}

type TokenGetter = () => Promise<string | null>;

let getAuthToken: TokenGetter = async () => null;

/** Called once from a client component after ClerkProvider mounts, so every
 *  api.* call can attach the current session's bearer token without every
 *  call site having to thread it through by hand. */
export function configureAuthToken(getter: TokenGetter) {
  getAuthToken = getter;
}

/**
 * Short-lived cache of in-flight and just-finished GETs, keyed by path.
 *
 * Every screen is a client component that refetches from scratch on mount, so
 * without this, clicking away from Clients and back blanks the table to a
 * spinner and re-runs three requests plus a Clerk token refresh for rows that
 * are seconds old. Two jobs: concurrent identical GETs share one response, and
 * a repeat GET inside the window resolves from memory.
 *
 * Any successful write clears the whole map rather than trying to guess which
 * paths a POST invalidated -- a matter write moves the dashboard, the client
 * row and the activity feed, and being wrong here means showing stale data.
 */
const GET_CACHE_TTL_MS = 30_000;
const getCache = new Map<string, { at: number; value: Promise<unknown> }>();

/**
 * Notified whenever the GET cache is dropped, so caches layered on top of it
 * -- useResource's snapshots in lib/org.tsx -- go with it instead of painting
 * rows a write just changed. A registry rather than a direct call because
 * lib/org.tsx imports this module, not the other way round.
 */
const invalidationListeners = new Set<() => void>();

export function onApiInvalidate(listener: () => void) {
  invalidationListeners.add(listener);
}

/** Drops every cached GET. Exported for callers that mutate outside request(). */
export function invalidateApiCache() {
  getCache.clear();
  for (const listener of invalidationListeners) listener();
}

/** Exported so lib/practice.ts shares one auth-token and error-mapping path
 *  rather than re-implementing fetch for the practice endpoints. */
export function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  // Only in the browser: a module-level map on the server would be shared
  // across every user's request.
  const cacheable = method === "GET" && typeof window !== "undefined";

  if (!cacheable) {
    const result = send<T>(path, init);
    if (method !== "GET") {
      // Registered before the caller's own .then, so a page that reloads
      // straight after a save sees the cleared map, not the pre-write rows.
      result.then(invalidateApiCache, () => {});
    }
    return result;
  }

  const hit = getCache.get(path);
  if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) {
    return hit.value as Promise<T>;
  }
  const value = send<T>(path, init);
  getCache.set(path, { at: Date.now(), value });
  // A failure must not be cached, or one blip pins the error for the window.
  value.catch(() => {
    if (getCache.get(path)?.value === value) getCache.delete(path);
  });
  return value;
}

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  // A FormData body must set its own content-type: the browser appends the
  // multipart boundary, and naming the type here would drop it and make the
  // upload unparseable on the server.
  const isMultipart = init?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(isMultipart ? {} : { "content-type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the API. Is it running on " +
        (API_BASE || window.location.origin) +
        "?",
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body; keep the generic message */
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{ status: string; corpus: Record<string, { instruments: number; articles: number }> }>(
      "/api/health",
    ),

  ask: (body: {
    question: string;
    jurisdiction: Jurisdiction;
    limit?: number;
    expand?: boolean;
    rerank?: boolean;
  }) => request<AskResponse>("/api/ask", { method: "POST", body: JSON.stringify(body) }),

  search: (body: {
    query: string;
    jurisdiction: Jurisdiction;
    limit?: number;
    expand?: boolean;
    rerank?: boolean;
  }) =>
    request<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  instruments: (jurisdiction: Jurisdiction, q?: string) =>
    request<Instrument[]>(
      `/api/instruments?jurisdiction=${jurisdiction}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),

  instrument: (id: number, offset = 0, limit = 50) =>
    request<{
      instrument: Instrument;
      articles: Article[];
      offset: number;
      limit: number;
    }>(`/api/instruments/${id}?offset=${offset}&limit=${limit}`),

  article: (id: number) => request<ArticleDetail>(`/api/articles/${id}`),

  explain: (id: number, language: "en" | "ar") =>
    request<{ article_id: number; citation: string; language: string; text: string }>(
      `/api/articles/${id}/explain`,
      { method: "POST", body: JSON.stringify({ language }) },
    ),

  createOrganization: (name: string) =>
    request<Organization>("/api/orgs", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  myOrganizations: () => request<Membership[]>("/api/orgs/me"),

  organization: (organizationId: number) =>
    request<Organization>(`/api/orgs/${organizationId}`),

  updateOrganization: (organizationId: number, body: OrganizationUpdate) =>
    request<Organization>(`/api/orgs/${organizationId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** Invitations this firm has issued. Owner only, server-side. */
  listInvites: (organizationId: number) =>
    request<PendingInvite[]>(`/api/orgs/${organizationId}/invites`),

  createInvite: (organizationId: number, email: string, role: "lawyer" | "staff") =>
    request<Invitation>(`/api/orgs/${organizationId}/invites`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  previewInvite: (token: string) =>
    request<InvitationPreview>(`/api/invites/${token}`),

  acceptInvite: (token: string) =>
    request<Membership>(`/api/invites/${token}/accept`, { method: "POST" }),

  listOrgMembers: (organizationId: number) =>
    request<OrgMember[]>(`/api/orgs/${organizationId}/members`),

  setMatterScope: (
    organizationId: number,
    clerkUserId: string,
    matterScope: MatterScope,
  ) =>
    request<{ clerk_user_id: string; role: string; matter_scope: MatterScope }>(
      `/api/orgs/${organizationId}/members/${clerkUserId}/matter-scope`,
      { method: "PUT", body: JSON.stringify({ matter_scope: matterScope }) },
    ),

  removeMember: (organizationId: number, clerkUserId: string) =>
    request<void>(`/api/orgs/${organizationId}/members/${clerkUserId}`, {
      method: "DELETE",
    }),
};

const ARABIC = /[؀-ۿ]/;

/** Direction follows the content, so Arabic statute text reads correctly
 *  inside an English page and vice versa. */
export function dirOf(text: string): "rtl" | "ltr" {
  return ARABIC.test(text) ? "rtl" : "ltr";
}
