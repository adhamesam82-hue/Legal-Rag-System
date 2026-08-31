"use client";

/**
 * Current-organization context and the data hooks built on it.
 *
 * Every practice screen is scoped to one firm, and the API paths carry that
 * organization id. Resolving it once here keeps each page from re-deriving it,
 * and gives one place to render the "no firm yet" and "API unreachable" states
 * instead of nineteen.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useAuth } from "@clerk/nextjs";
import {
  API_BASE,
  ApiError,
  api,
  onApiInvalidate,
  type Membership,
  type OrgMember,
} from "@/lib/api";
import { USING_CLERK } from "@/lib/auth-mode";
import { practiceApi, type PracticeApi, type Role } from "@/lib/practice";

interface OrgContextValue {
  organizationId: number | null;
  organizationName: string | null;
  role: Role | null;
  memberships: Membership[];
  members: OrgMember[];
  /** Practice API bound to the current organization; null until one resolves. */
  practice: PracticeApi | null;
  /**
   * True once /api/orgs/me has answered. While false, `organizationId` may be
   * the provisional one restored from the last session, which is almost always
   * right but is not yet proven to be a firm this account still belongs to.
   */
  orgConfirmed: boolean;
  loading: boolean;
  error: string | null;
  setOrganizationId: (id: number) => void;
  reloadMembers: () => void;
  /** Refetches the caller's organizations — call after creating or joining one. */
  reloadOrganizations: () => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "legalos.organizationId";

type AuthState = "loading" | "signed-in" | "signed-out";

/**
 * Reports Clerk's session state to OrgProvider.
 *
 * Split into its own component because useAuth() only works under
 * ClerkProvider, which is not mounted in dev-auth mode. USING_CLERK is a
 * module constant, so the branch below never flips between renders and hook
 * order stays stable.
 */
function ClerkAuthGate({
  children,
}: {
  children: (state: AuthState) => React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <>
      {children(
        !isLoaded ? "loading" : isSignedIn ? "signed-in" : "signed-out",
      )}
    </>
  );
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  if (!USING_CLERK) {
    return <OrgProviderInner authState="signed-in">{children}</OrgProviderInner>;
  }
  return (
    <ClerkAuthGate>
      {(authState) => (
        <OrgProviderInner authState={authState}>{children}</OrgProviderInner>
      )}
    </ClerkAuthGate>
  );
}

function OrgProviderInner({
  authState,
  children,
}: {
  authState: AuthState;
  children: React.ReactNode;
}) {
  const describeError = useApiErrorMessage();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [organizationId, setOrganizationIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membersNonce, setMembersNonce] = useState(0);
  const [orgsNonce, setOrgsNonce] = useState(0);
  const [orgConfirmed, setOrgConfirmed] = useState(false);

  /**
   * Bind the organization from the last session before the membership check
   * answers.
   *
   * Every screen's data request is keyed on `practice`, which stays null until
   * an organization id exists -- so leaving it null until /api/orgs/me returns
   * put a full API round-trip in front of the first byte of page data on every
   * cold load, on top of Clerk's own session resolution. The id is already
   * persisted here for the firm switcher, so reusing it lets a screen's request
   * leave at the same time as the membership check rather than behind it.
   *
   * Provisional, not trusted: the reconciliation below replaces it if the
   * account no longer belongs to that firm, and useResource holds back any
   * error raised against it until `orgConfirmed`. Runs in an effect rather than
   * a lazy initial state because localStorage does not exist while the tree is
   * rendered on the server, and seeding it there would be a hydration mismatch.
   */
  useEffect(() => {
    if (authState !== "signed-in") return;
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (!stored) return;
    setOrganizationIdState((current) => current ?? stored);
  }, [authState]);

  useEffect(() => {
    // Waiting on Clerk: hold the loading state rather than briefly claiming
    // the account has no firm.
    if (authState === "loading") return;
    // Signed out: the API would 403. Middleware redirects these visitors to
    // sign-in, so there is nothing to fetch for.
    if (authState === "signed-out") {
      setMemberships([]);
      setOrganizationIdState(null);
      setOrgConfirmed(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .myOrganizations()
      .then((rows) => {
        if (cancelled) return;
        setMemberships(rows);
        // Reconciles the provisional id bound above: when the remembered firm
        // is still one of this account's, this resolves to the same number and
        // React bails out, so the fetches already in flight against it stand.
        const stored = Number(window.localStorage.getItem(STORAGE_KEY));
        const remembered = rows.find((m) => m.organization_id === stored);
        setOrganizationIdState(
          (remembered ?? rows[0])?.organization_id ?? null,
        );
        setError(null);
      })
      .catch((exc: unknown) => {
        if (cancelled) return;
        setError(describeError(exc));
      })
      .finally(() => {
        if (cancelled) return;
        // Set even on failure: it means "the membership check is no longer
        // outstanding", so a screen holding back a provisional error stops
        // waiting for an answer that is not coming.
        setOrgConfirmed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgsNonce, authState]);

  useEffect(() => {
    if (organizationId === null || authState !== "signed-in") return;
    let cancelled = false;
    api
      .listOrgMembers(organizationId)
      .then((rows) => !cancelled && setMembers(rows))
      .catch(() => !cancelled && setMembers([]));
    return () => {
      cancelled = true;
    };
  }, [organizationId, membersNonce, authState]);

  /**
   * Persist whichever organization is active, however it was chosen.
   *
   * The switcher used to be the only writer, so an account that never switched
   * firms -- almost all of them, since most belong to one -- had nothing stored
   * to restore on the next load, and the provisional binding above could never
   * fire. Writing it here covers the id resolved from /api/orgs/me too.
   */
  useEffect(() => {
    if (organizationId !== null) {
      window.localStorage.setItem(STORAGE_KEY, String(organizationId));
      return;
    }
    // Confirmed to belong to no firm: drop the remembered id rather than let it
    // seed a provisional binding that can only 403 on every future load.
    if (orgConfirmed) window.localStorage.removeItem(STORAGE_KEY);
  }, [organizationId, orgConfirmed]);

  const setOrganizationId = useCallback((id: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(id));
    setOrganizationIdState(id);
  }, []);

  // Memoised on the organization alone. useResource keys its effect on this
  // object, so building a fresh one inside the context value below would refire
  // every screen's fetches when the unrelated `members` list arrives -- every
  // page loaded its data twice on the first navigation after sign-in.
  const practice = useMemo(
    () => (organizationId === null ? null : practiceApi(organizationId)),
    [organizationId],
  );

  const value = useMemo<OrgContextValue>(() => {
    const active = memberships.find((m) => m.organization_id === organizationId);
    return {
      organizationId,
      organizationName: active?.organization_name ?? null,
      role: (active?.role as Role) ?? null,
      memberships,
      members,
      practice,
      orgConfirmed,
      loading,
      error,
      setOrganizationId,
      reloadMembers: () => setMembersNonce((n) => n + 1),
      reloadOrganizations: () => setOrgsNonce((n) => n + 1),
    };
  }, [
    organizationId,
    memberships,
    members,
    practice,
    orgConfirmed,
    loading,
    error,
    setOrganizationId,
  ]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * Turns a rejected request into a sentence to put on screen.
 *
 * Server messages arrive in one language and are shown as they come — they
 * name the record and the rule that refused it, which is worth more than a
 * translated generality. The exception is a fetch that never reached the
 * server: status 0 is produced by lib/api.ts itself, in English, and it was
 * the sentence a lawyer met most often on an Arabic screen, half in each
 * language, blaming their connection for what was usually a 500.
 */
export function useApiErrorMessage() {
  const t = useTranslator();
  return useCallback(
    (exc: unknown): string => {
      if (exc instanceof ApiError) {
        return exc.status === 0
          ? t("@legalos.common.error.network", { base: API_BASE })
          : exc.message;
      }
      return t("@legalos.common.error.unknown");
    },
    [t],
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}

/**
 * A readable name for a member whose display name is not set.
 *
 * In production Clerk supplies one, but a membership created by accepting an
 * invitation has none until somebody fills it in, and the local dev users
 * have none at all — so assignment menus and activity feeds printed raw ids
 * like `user_karim_nabil` in the middle of Arabic prose. Deriving the name
 * from the id is not a substitute for the real one; it is the difference
 * between a row that reads as a person and one that reads as a database key.
 */
export function memberFallbackName(clerkUserId: string): string {
  const stripped = clerkUserId.replace(/^user_/, "").replace(/[_-]+/g, " ").trim();
  if (!stripped) return clerkUserId;
  return stripped.replace(/\b\p{Ll}/gu, (letter) => letter.toUpperCase());
}

/** The label to show for a member anywhere one is named. */
export function memberLabel(
  member: { display_name: string | null; clerk_user_id: string },
): string {
  return member.display_name ?? memberFallbackName(member.clerk_user_id);
}

/** Maps a Clerk user id to something worth showing a human. */
export function useMemberName() {
  const { members } = useOrg();
  const t = useTranslator();
  return useCallback(
    (clerkUserId: string | null | undefined): string => {
      if (!clerkUserId) return "—";
      // The assistant is the one "member" with no row behind it, so its name
      // is chrome rather than data and comes from the catalog — it used to be
      // the literal "AI Assistant", sitting untranslated in an Arabic
      // activity feed between Arabic names.
      if (clerkUserId === "system:ai") return t("@legalos.shell.nav.aiAssistant");
      const member = members.find((m) => m.clerk_user_id === clerkUserId);
      return member?.display_name ?? memberFallbackName(clerkUserId);
    },
    [members, t],
  );
}

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Refetches; call after a mutation so the screen reflects what was written. */
  reload: () => void;
}

/**
 * The last value each resource produced, kept past the unmount of the screen
 * that produced it.
 *
 * Without this every navigation is a cold start: `data` begins null, so
 * DataView renders the spinner, and the screen stays on it until its requests
 * come back. Clicking Cases, then Clients, then Cases again showed
 * "جارٍ تحميل القضايا…" all three times, for rows that were already in memory.
 *
 * api.ts's GET cache cannot fix that by itself. It spares the round trip, but
 * the fetch still resolves in a microtask after the effect runs, and effects
 * run after the browser has painted -- so the spinner frame happens either
 * way. The value has to be read *synchronously* during the first render, which
 * is what this map is for; the refetch then runs behind the rows on screen.
 *
 * What is painted can therefore be one revalidation stale, so any write clears
 * the map (below) rather than let a screen show rows the user just changed.
 */
const SNAPSHOT_LIMIT = 64;
const snapshots = new Map<string, unknown>();

/**
 * `undefined` means no snapshot; a stored value may legitimately be null.
 *
 * Deliberately does not touch the map. It is called during render, and a
 * render React discards must leave nothing behind -- recency is maintained by
 * writeSnapshot instead, which every adopted snapshot reaches anyway when its
 * revalidation lands.
 */
function peekSnapshot(key: string): unknown {
  return snapshots.has(key) ? snapshots.get(key) : undefined;
}

function writeSnapshot(key: string, value: unknown) {
  // Reinserted, not overwritten, so eviction drops the least recently *written*
  // entry rather than the oldest -- opening sixty matters must not evict the
  // list screen the user keeps returning to.
  snapshots.delete(key);
  snapshots.set(key, value);
  if (snapshots.size > SNAPSHOT_LIMIT) {
    const oldest = snapshots.keys().next();
    if (!oldest.done) snapshots.delete(oldest.value);
  }
}

// Writes drop the GET cache; these have to go with it, or the next visit to a
// screen the write touched paints its pre-write rows.
onApiInvalidate(() => snapshots.clear());

/**
 * A fetcher, optionally carrying the source text of the call site it stands in
 * for.
 *
 * Only wrappers set it. A wrapper built inside a hook has one source text for
 * every caller of that hook, so keying on it directly would hand two unrelated
 * screens the same snapshot -- see useOptionalResource.
 */
type Fetcher<T> = ((practice: PracticeApi) => Promise<T>) & {
  snapshotSource?: string;
};

/**
 * Identifies a resource across mounts: which firm, which call site, which
 * arguments.
 *
 * The call site is identified by the fetcher's own source text, because
 * callers write it inline and pass no key. Two call sites whose source *and*
 * deps both match are fetching the same thing, so sharing one entry returns
 * the right value rather than the wrong one. Deps belong in the key for the
 * same reason the effect below depends on them: /cases/7 and /cases/9 are not
 * the same resource. The organization does too -- a snapshot must never cross
 * from one firm to another.
 *
 * Returns null when deps will not serialise, which turns snapshotting off for
 * that caller instead of guessing at a key that might collide.
 */
function snapshotKey(
  organizationId: number,
  fetcher: Fetcher<unknown>,
  deps: unknown[],
): string | null {
  let serialisedDeps: string;
  try {
    serialisedDeps = JSON.stringify(deps) ?? "";
  } catch {
    return null;
  }
  // NUL-separated: it cannot occur in function source or in JSON, so no
  // combination of the three parts can spell another key.
  return [organizationId, fetcher.snapshotSource ?? String(fetcher), serialisedDeps]
    .join("\u0000");
}

/**
 * Runs `fetcher` once the organization is known, and again whenever `deps`
 * change. `fetcher` is intentionally not a dependency -- callers write it
 * inline, so a new function identity every render would loop forever.
 *
 * A screen that has been loaded before paints from the snapshot map above on
 * its first render and revalidates behind what is already shown.
 */
export function useResource<T>(
  fetcher: (practice: PracticeApi) => Promise<T>,
  deps: unknown[],
): Resource<T> {
  const { practice, organizationId, orgConfirmed, loading: orgLoading } = useOrg();
  const describeError = useApiErrorMessage();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const key =
    organizationId === null
      ? null
      : snapshotKey(organizationId, fetcher, deps);

  /**
   * Adopt the snapshot for `key`, during render rather than in an effect.
   *
   * An effect would run after the paint this exists to prevent, so the spinner
   * would still flash. Setting state during render is React's supported way to
   * derive state from a changing input: it re-renders before committing, and
   * the guard below makes it happen once per key. Held in state rather than a
   * ref so a render React discards takes the bookkeeping with it.
   *
   * Not reachable on the very first render of a cold load -- `organizationId`
   * arrives in an effect, so `key` is null until then -- which is why this is
   * keyed on the value rather than done once on mount.
   */
  const [adoptedKey, setAdoptedKey] = useState<string | null>(null);
  if (key !== null && key !== adoptedKey) {
    setAdoptedKey(key);
    const snapshot = peekSnapshot(key);
    // A miss deliberately leaves `data` alone: when deps change under a loaded
    // screen (typing in the matters search) the previous rows should stay up
    // until the new ones arrive, which is what the fetch below assumes too.
    if (snapshot !== undefined) {
      setData(snapshot as T);
      setLoading(false);
      setError(null);
    }
  }

  // Whether this hook has something on screen, read inside the effect without
  // making `data` a dependency of it -- it would refire the fetch on its own
  // result. Synced in an effect declared before that one, so it is already true
  // by the time a snapshot-seeded commit reaches it.
  const hasDataRef = useRef(false);
  useEffect(() => {
    hasDataRef.current = data !== null;
  }, [data]);

  useEffect(() => {
    if (!practice) {
      // Still resolving the org, or there is none; leave the spinner up only
      // while the org itself is loading.
      if (!orgLoading) setLoading(false);
      return;
    }
    let cancelled = false;
    // Held back rather than surfaced, so the run that follows confirmation can
    // decide whether this was a stale organization id or a real failure.
    let provisionalFailure = false;
    // Re-running against an already-loaded screen must not blank it back to a
    // spinner -- the confirmation pass below re-enters this effect on every
    // cold load, and it almost always resolves from the GET cache.
    if (!hasDataRef.current) setLoading(true);
    fetcherRef
      .current(practice)
      .then((result) => {
        // Recorded before the cancellation check, and touching no React state,
        // so a request that lands after the user has clicked away still
        // benefits the visit that comes back to this screen.
        if (key !== null) writeSnapshot(key, result);
        if (cancelled) return;
        hasDataRef.current = true;
        setData(result);
        setError(null);
      })
      .catch((exc: unknown) => {
        if (cancelled) return;
        // The organization id may still be the provisional one restored from
        // the last session; if the account has left that firm, the API answers
        // 403. Showing that would flash an error on a screen that is about to
        // load correctly, so hold it: confirmation re-enters this effect, and
        // the retry either succeeds or raises the error for real.
        if (!orgConfirmed) {
          provisionalFailure = true;
          return;
        }
        setError(describeError(exc));
      })
      .finally(() => {
        if (cancelled || provisionalFailure) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, orgConfirmed, orgLoading, nonce, ...deps]);

  return {
    data,
    loading,
    error,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}

/** Like useResource, but a 404 resolves to null instead of an error --
 *  for records that legitimately may not exist, such as a matter's case. */
export function useOptionalResource<T>(
  fetcher: (practice: PracticeApi) => Promise<T>,
  deps: unknown[],
): Resource<T> {
  const wrapped: Fetcher<T> = (practice) =>
    fetcher(practice).catch((exc: unknown) => {
      if (exc instanceof ApiError && exc.status === 404) {
        return null as T;
      }
      throw exc;
    });
  // Without this every caller of this hook keys on the wrapper's source above,
  // which is the same text for all of them.
  wrapped.snapshotSource = String(fetcher);
  return useResource<T>(wrapped, deps);
}
