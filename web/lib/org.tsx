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
import { ApiError, api, type Membership, type OrgMember } from "@/lib/api";
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
        setError(
          exc instanceof ApiError
            ? exc.message
            : "Could not load your organizations.",
        );
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

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
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
      return member?.display_name ?? clerkUserId;
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
 * Runs `fetcher` once the organization is known, and again whenever `deps`
 * change. `fetcher` is intentionally not a dependency -- callers write it
 * inline, so a new function identity every render would loop forever.
 */
export function useResource<T>(
  fetcher: (practice: PracticeApi) => Promise<T>,
  deps: unknown[],
): Resource<T> {
  const { practice, orgConfirmed, loading: orgLoading } = useOrg();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Whether this hook has ever produced a value, read inside the effect without
  // making `data` a dependency of it.
  const hasDataRef = useRef(false);

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
        setError(exc instanceof ApiError ? exc.message : "Something went wrong.");
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
  return useResource<T>(
    (practice) =>
      fetcher(practice).catch((exc: unknown) => {
        if (exc instanceof ApiError && exc.status === 404) {
          return null as T;
        }
        throw exc;
      }),
    deps,
  );
}
