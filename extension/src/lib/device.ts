/**
 * A random ID that identifies this browser install. The server links each browser to one account, so one
 * person cannot collect free credits with several Google accounts on the same browser.
 *
 * It is kept in both local and sync storage: clearing local data does not reset it while Chrome sync is on.
 */
const KEY = "applier_device_id";

async function read(area: chrome.storage.StorageArea): Promise<string | null> {
  try { return (await area.get(KEY))[KEY] ?? null; } catch { return null; }
}

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const id = (await read(chrome.storage.local)) ?? (await read(chrome.storage.sync)) ?? crypto.randomUUID();
  cached = id;
  // Keep both copies in step (sync may be unavailable; that is fine).
  await chrome.storage.local.set({ [KEY]: id });
  try { await chrome.storage.sync.set({ [KEY]: id }); } catch { /* sync disabled */ }
  return id;
}
