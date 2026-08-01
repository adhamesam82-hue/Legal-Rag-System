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
}

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
}

export interface InvitationPreview {
  organization_name: string;
  role: "lawyer" | "staff";
  status: "pending" | "accepted" | "expired" | "revoked";
}

export interface OrgMember {
  clerk_user_id: string;
  role: "owner" | "lawyer" | "staff";
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

/** Exported so lib/practice.ts shares one auth-token and error-mapping path
 *  rather than re-implementing fetch for the practice endpoints. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
      "Could not reach the API. Is it running on " + API_BASE + "?",
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
