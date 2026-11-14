import type { Detect } from "../api/types";

/** A remembered verdict for one page. `override` is the user's own answer and wins over the detector's. */
export interface Entry {
  v: Detect;
  override?: boolean;
  at: number; // ms since epoch
}

export const MAX_ENTRIES = 300;
export const TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Tracking parameters never change what a page is. Everything else may (job sites put the job id in the query).
const TRACKING = /^(utm_.*|gclid|fbclid|msclkid|mc_cid|mc_eid|igshid|ref|ref_src|refid|trk|trackingid|_hsenc|_hsmi)$/i;

/** One key per page: no hash, no tracking parameters, stable parameter order, no trailing slash. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    keep.forEach(([k, v]) => u.searchParams.append(k, v));
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return raw;
  }
}

/** Drop expired entries, then the oldest ones beyond the limit. */
export function prune(map: Record<string, Entry>, now = Date.now(), ttl = TTL_MS, max = MAX_ENTRIES): Record<string, Entry> {
  const live = Object.entries(map).filter(([, e]) => now - e.at <= ttl);
  live.sort(([, a], [, b]) => b.at - a.at); // newest first
  return Object.fromEntries(live.slice(0, max));
}

/** Only verdicts that came from real analysis are worth remembering. A "too little text" answer usually means the
 *  page was still loading, and caching it would hide the job once the page finishes rendering. */
export const cacheable = (d: Detect): boolean => d.method === "structured" || d.method === "llm";

export const STUB: Detect = { is_job: false, confidence: 0, job_title: "", company: "", reason: "", method: "heuristic" };
