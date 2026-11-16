import type { Detect } from "../api/types";
import { STUB, cacheable, fresh, normalizeUrl, prune, type Entry } from "./detectCacheCore";

/**
 * Remembers, on this device only, whether each page was a job posting, so scanning a page again (switching tabs,
 * reopening the panel) is instant and costs no AI call. Nothing here is sent to our servers.
 */
const KEY = "applier_detect_cache";

async function load(): Promise<Record<string, Entry>> {
  return ((await chrome.storage.local.get(KEY))[KEY] as Record<string, Entry> | undefined) ?? {};
}
const save = (map: Record<string, Entry>) => chrome.storage.local.set({ [KEY]: prune(map) });

export async function getCached(url: string): Promise<Entry | null> {
  const e = (await load())[normalizeUrl(url)];
  return e && fresh(e) ? e : null;
}

/** Remember the detector's verdict. A fresh verdict replaces any earlier manual override for that page. */
export async function putDetect(url: string, v: Detect): Promise<void> {
  if (!cacheable(v)) return;
  const map = await load();
  map[normalizeUrl(url)] = { v, at: Date.now() };
  await save(map);
}

/** Remember the user's own answer ("this is / is not a job page") for that page. */
export async function putOverride(url: string, override: boolean, current: Detect | null): Promise<void> {
  const map = await load();
  const key = normalizeUrl(url);
  map[key] = { v: map[key]?.v ?? current ?? STUB, override, at: Date.now() };
  await save(map);
}

export const clearDetectCache = () => chrome.storage.local.remove(KEY);
