const KEY = "applier_token";

export async function getToken(): Promise<string | null> {
  return (await chrome.storage.local.get(KEY))[KEY] ?? null;
}
export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [KEY]: token });
}
export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}
