"use client";

import { useEffect, useState } from "react";
import { api, type Jurisdiction } from "@/lib/api";

export interface CorpusCounts {
  instruments: number;
  articles: number;
}

/**
 * Live corpus size per jurisdiction, straight from `/api/health`.
 *
 * Every surface that tells a lawyer what the AI can see reads it from here.
 * Hardcoding these numbers is how a screen ends up claiming coverage the
 * corpus does not have — the Saudi corpus in particular is declared in the
 * schema and selectable in the UI but has no articles ingested yet, and
 * `has()` is what lets a screen say so instead of offering an empty search.
 */
export function useCorpusStats() {
  const [stats, setStats] = useState<Record<string, CorpusCounts> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .health()
      .then((h) => live && setStats(h.corpus))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  return {
    stats,
    failed,
    /** Counts for one jurisdiction; zeroes rather than undefined so callers
     *  can render a number before /api/health resolves. */
    counts(jurisdiction: Jurisdiction): CorpusCounts {
      return stats?.[jurisdiction] ?? { instruments: 0, articles: 0 };
    },
    /** Whether anything is actually indexed for a jurisdiction. Unknown while
     *  the request is in flight, so treat that as available rather than
     *  flashing an "empty corpus" warning on every page load. */
    has(jurisdiction: Jurisdiction): boolean {
      if (!stats) return true;
      return (stats[jurisdiction]?.articles ?? 0) > 0;
    },
  };
}
