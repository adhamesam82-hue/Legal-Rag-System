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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
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
};

const ARABIC = /[؀-ۿ]/;

/** Direction follows the content, so Arabic statute text reads correctly
 *  inside an English page and vice versa. */
export function dirOf(text: string): "rtl" | "ltr" {
  return ARABIC.test(text) ? "rtl" : "ltr";
}
