import type { PageData } from "../api/types";

/**
 * Injected into the page via chrome.scripting.executeScript, so it must be
 * fully self-contained (no imports or outer-scope references).
 */
function readPage() {
  const clean = (s: string) => s.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  const stripHtml = (h: string) => {
    const d = document.createElement("div");
    d.innerHTML = h;
    return clean(d.innerText || d.textContent || "");
  };

  // schema.org JobPosting JSON-LD is the strongest signal and the cleanest text.
  let structured: Record<string, any> | null = null;
  const visit = (node: any) => {
    if (!node || structured) return;
    if (Array.isArray(node)) return node.forEach(visit);
    const t = node["@type"];
    if (t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))) {
      structured = {
        title: node.title ?? "",
        hiringOrganization: node.hiringOrganization ?? "",
        description: typeof node.description === "string" ? stripHtml(node.description) : "",
      };
      return;
    }
    if (node["@graph"]) visit(node["@graph"]);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try { visit(JSON.parse(el.textContent || "")); } catch { /* ignore malformed JSON-LD */ }
  });

  const root = (document.querySelector("main, article, [role=main]") as HTMLElement | null) ?? document.body;
  let text = clean(root.innerText || "");
  if (text.length < 500) text = clean(document.body.innerText || "");
  const jd = (structured as any)?.description as string | undefined;
  if (jd && jd.length > 200) text = jd; // cleaner than scraped page chrome

  return { url: location.href, title: document.title, text: text.slice(0, 15000), structured };
}

export async function readActiveTab(): Promise<PageData | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) return null; // chrome://, web store, etc.
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
    return (res?.result as PageData) ?? null;
  } catch {
    return null;
  }
}
