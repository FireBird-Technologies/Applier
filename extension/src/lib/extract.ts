import type { PageData } from "../api/types";

/**
 * Injected into the page via chrome.scripting.executeScript, so it must be
 * fully self-contained (no imports or outer-scope references).
 */
function readPage() {
  // Readable characters only: no control/zero-width/private-use chars, emoji, URLs or junk tokens;
  // collapsed whitespace; repeated short lines (menus) dropped.
  const clean = (s: string) => {
    const seen = new Set<string>();
    return s
      .normalize("NFKC")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿-]/g, "")
      .replace(/\p{So}/gu, " ")
      .replace(/https?:\/\/\S+|www\.\S+/g, " ")
      .replace(/\S{41,}/g, " ")
      .replace(/[ \t ]+/g, " ")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => {
        if (l && l.length < 60) {
          if (seen.has(l)) return false;
          seen.add(l);
        }
        return true;
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
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

  // Text from the page's HTML source. Unlike innerText it also includes collapsed/hidden sections
  // (accordions, "read more" blocks, tabs) where many sites keep the real job description.
  const copy = document.documentElement.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("script, style, noscript, svg, iframe, nav, header, footer, template").forEach((n) => n.remove());
  const htmlText = clean((copy.querySelector("main, article, [role=main]") ?? copy.querySelector("body") ?? copy).textContent || "");
  if (htmlText.length > text.length * 1.3) text = htmlText;

  const jd = (structured as any)?.description as string | undefined;
  if (jd && jd.length > 200) text = jd; // cleanest source when the site provides it

  // Cheap hints from the HTML that a classifier can use: meta tags, main heading, apply/upload controls.
  const meta = (sel: string) => (document.querySelector(sel) as HTMLMetaElement | null)?.content?.trim() ?? "";
  const applyControls = Array.from(document.querySelectorAll("a, button, input[type=submit]"))
    .map((el) => (el.textContent || (el as HTMLInputElement).value || "").trim())
    .filter((t) => /^(easy\s+)?apply( now| for this job| to this job)?$|submit application|apply on company site/i.test(t));
  const signals = [
    `og:type=${meta('meta[property="og:type"]')}`,
    `og:title=${meta('meta[property="og:title"]')}`,
    `description=${meta('meta[name="description"]') || meta('meta[property="og:description"]')}`,
    `h1=${(document.querySelector("h1")?.textContent || "").trim().slice(0, 200)}`,
    `apply_buttons=${applyControls.length}`,
    `resume_upload_field=${!!document.querySelector('input[type=file][name*="resume" i], input[type=file][name*="cv" i], input[type=file][id*="resume" i], input[type=file][accept*=".pdf"]')}`,
    `job_posting_structured_data=${!!structured}`,
  ].join("\n").slice(0, 1500);

  return { url: location.href, title: document.title, text: text.slice(0, 15000), structured, signals };
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
