/**
 * What a firm sees this month. One source of truth for the nav and the routes.
 *
 * Nothing is deleted. Every hidden screen still compiles and still type-checks
 * against the API, because code excluded from the build rots against it within
 * weeks and code behind a flag does not.
 *
 * The enabled set comes from an env var, so staging shows everything and
 * production shows the shipped set from the same build and the same code path
 * — no branch to keep alive.
 *
 *   NEXT_PUBLIC_LEGALOS_FEATURES=all        show every screen (staging)
 *   NEXT_PUBLIC_LEGALOS_FEATURES=library    ship the default set plus /library
 *   (unset)                                 the shipped set below
 *
 * Read at build time, like every NEXT_PUBLIC_ value, so changing it needs a
 * redeploy rather than a restart.
 */

/** Every gateable surface. Add one here before gating a route on it. */
export type Feature =
  | "crm"
  | "library"
  | "knowledgeBase"
  | "aiAssistant"
  | "legalResearch"
  | "contractReview"
  | "accounting"
  | "reports"
  | "messages"
  | "automation";

/**
 * On by default. Deliberately small: a screen ships when a firm can finish a
 * job on it, not when it renders.
 *
 * Everything absent from this set is absent for one of three reasons, and the
 * reason decides what it takes to add it back:
 *
 *   no backend at all      contractReview, automation, knowledgeBase
 *                          — real product work, not wiring.
 *
 *   backend built, screen  crm, accounting, reports, messages
 *   not wired to it        — days of work each; see the readiness tickets.
 *
 *   deliberately withheld  aiAssistant, legalResearch, library
 *                          — see the note below.
 */
const SHIPPED: ReadonlySet<Feature> = new Set<Feature>([]);

/*
 * On the three withheld ones.
 *
 * aiAssistant and legalResearch are off at the product owner's request.
 * Hiding them from the nav does NOT close /api/ask, /api/search or the explain
 * route — that is server-side work, and it is done (see legalrag.ratelimit and
 * the auth dependencies added in batch 0). Do not assume the nav is a control.
 *
 * `library` is the statute corpus browser, and it was off by a *safety*
 * default rather than by instruction: the corpus is a snapshot with no
 * amendment tracking, and it holds Labour Law 12/2003 next to the 14/2025
 * that replaced it, unrelated and both live. A lawyer browsing to the
 * superseded one saw nothing to tell them so -- a risk identical whether an
 * LLM reads the article or a person does, which is why hiding the AI screens
 * alone would have kept the hazard and lost only the wrapper.
 *
 * That condition is now met. Migration 0015 records supersession between
 * instruments, and every article and instrument response carries a `currency`
 * field: when the law was fetched, and whether a later one replaced it. The
 * text says how old it is instead of implying it is current.
 *
 * So the flag is a PRODUCT decision now rather than a safety one. Turn the
 * browser on with NEXT_PUBLIC_LEGALOS_FEATURES=library once the screens render
 * that warning -- the API supplies it; a page that fetches `currency` and
 * ignores it would be worse than one that never had it, because the caveat
 * would look handled.
 */

function parseEnabled(raw: string | undefined): ReadonlySet<Feature> | "all" {
  const value = (raw ?? "").trim();
  if (!value) return SHIPPED;
  if (value.toLowerCase() === "all") return "all";
  return new Set(
    value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean) as Feature[],
  );
}

const ENABLED = parseEnabled(process.env.NEXT_PUBLIC_LEGALOS_FEATURES);

/** Whether this surface is shown in this build. */
export function isEnabled(feature: Feature): boolean {
  return ENABLED === "all" || ENABLED.has(feature);
}

/**
 * The feature a path belongs to, or null when it is always on.
 *
 * Longest prefix wins, so a nested route cannot be left ungated by a shorter
 * one matching first.
 */
const ROUTE_FEATURES: ReadonlyArray<readonly [string, Feature]> = [
  ["/crm", "crm"],
  ["/library", "library"],
  ["/article", "library"],
  ["/knowledge-base", "knowledgeBase"],
  ["/ai-assistant", "aiAssistant"],
  ["/legal-research", "legalResearch"],
  ["/search", "legalResearch"],
  ["/contract-review", "contractReview"],
  ["/accounting", "accounting"],
  ["/reports", "reports"],
  ["/messages", "messages"],
  ["/automation", "automation"],
];

export function featureForPath(path: string): Feature | null {
  let match: Feature | null = null;
  let matchedLength = 0;
  for (const [prefix, feature] of ROUTE_FEATURES) {
    if ((path === prefix || path.startsWith(prefix + "/")) && prefix.length > matchedLength) {
      match = feature;
      matchedLength = prefix.length;
    }
  }
  return match;
}

/** Whether this path may be reached at all in this build. */
export function isPathEnabled(path: string): boolean {
  const feature = featureForPath(path);
  return feature === null || isEnabled(feature);
}
