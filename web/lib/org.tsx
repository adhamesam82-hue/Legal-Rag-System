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
import { ApiError, api, type Membership, type OrgMember } from "@/lib/api";
import { practiceApi, type PracticeApi, type Role } from "@/lib/practice";

interface OrgContextValue {
  organizationId: number | null;
  organizationName: string | null;
  role: Role | null;
  memberships: Membership[];
  members: OrgMember[];
  /** Practice API bound to the current organization; null until one resolves. */
  practice: PracticeApi | null;
  loading: boolean;
  error: string | null;
  setOrganizationId: (id: number) => void;
  reloadMembers: () => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "legalos.organizationId";

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [organizationId, setOrganizationIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membersNonce, setMembersNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .myOrganizations()
      .then((rows) => {
        if (cancelled) return;
        setMemberships(rows);
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
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (organizationId === null) return;
    let cancelled = false;
    api
      .listOrgMembers(organizationId)
      .then((rows) => !cancelled && setMembers(rows))
      .catch(() => !cancelled && setMembers([]));
    return () => {
      cancelled = true;
    };
  }, [organizationId, membersNonce]);

  const setOrganizationId = useCallback((id: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(id));
    setOrganizationIdState(id);
  }, []);

  const value = useMemo<OrgContextValue>(() => {
    const active = memberships.find((m) => m.organization_id === organizationId);
    return {
      organizationId,
      organizationName: active?.organization_name ?? null,
      role: (active?.role as Role) ?? null,
      memberships,
      members,
      practice: organizationId === null ? null : practiceApi(organizationId),
      loading,
      error,
      setOrganizationId,
      reloadMembers: () => setMembersNonce((n) => n + 1),
    };
  }, [organizationId, memberships, members, loading, error, setOrganizationId]);

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
  return useCallback(
    (clerkUserId: string | null | undefined): string => {
      if (!clerkUserId) return "—";
      if (clerkUserId === "system:ai") return "AI Assistant";
      const member = members.find((m) => m.clerk_user_id === clerkUserId);
      return member?.display_name ?? clerkUserId;
    },
    [members],
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
  const { practice, loading: orgLoading } = useOrg();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!practice) {
      // Still resolving the org, or there is none; leave the spinner up only
      // while the org itself is loading.
      if (!orgLoading) setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetcherRef
      .current(practice)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((exc: unknown) => {
        if (cancelled) return;
        setError(exc instanceof ApiError ? exc.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, orgLoading, nonce, ...deps]);

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
