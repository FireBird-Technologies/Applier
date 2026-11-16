import type { PageData } from "../api/types";

/**
 * Injected into the page via chrome.scripting.executeScript, so it must be
 * fully self-contained (no imports or outer-scope references).
 */
async function readPage() {
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

  // LinkedIn, signed in: no JobPosting data, and the open job usually sits beside a list of other jobs, so the
  // whole page reads like a search page. Read only the open job. Class names there change often, so each lookup
  // has fallbacks that do not depend on them.
  const linkedIn = async () => {
    if (!/(^|\.)linkedin\.com$/.test(location.hostname) || !location.pathname.startsWith("/jobs")) return null;
    const idIn = (s: string) => s.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d+)/)?.[1] ?? "";
    const jobId = () => new URLSearchParams(location.search).get("currentJobId") || idIn(location.pathname);
    const first = (sels: string[], within: ParentNode = document) => {
      for (const s of sels) {
        const el = within.querySelector(s) as HTMLElement | null;
        if (el) return el;
      }
      return null;
    };
    const line = (el: Element | null | undefined) =>
      (((el as HTMLElement | null)?.innerText || el?.textContent || "").trim().split("\n")[0] || "").trim();

    const findDescription = () => {
      const known = first(["#job-details", ".jobs-description__content", ".jobs-description-content__text", ".jobs-box__html-content",
        ".show-more-less-html__markup", ".description__text", '[data-testid="expandable-text-box"]']);
      if (known && known.innerText.trim().length > 200) return known;
      const heading = Array.from(document.querySelectorAll("h2, h3")).find((h) => /^about the job$/i.test((h.textContent || "").trim()));
      let el = heading?.parentElement ?? null;
      for (let i = 0; el && i < 4 && !el.matches("main, body, [role=main]"); i++, el = el.parentElement) {
        if (el.innerText.trim().length > 300) return el;
      }
      return null;
    };
    const paneOf = (d: HTMLElement) =>
      d.closest(".jobs-search__job-details--container, .jobs-details, .job-view-layout, .scaffold-layout__detail") as HTMLElement | null;
    // After clicking another job in the list the URL changes first and the old job stays on screen for a moment.
    const stale = (d: HTMLElement) => {
      const id = new URLSearchParams(location.search).get("currentJobId");
      const shown = idIn(paneOf(d)?.querySelector('h1 a[href*="/jobs/view/"], h2 a[href*="/jobs/view/"]')?.getAttribute("href") || "");
      return !!id && !!shown && shown !== id;
    };

    // Wait (about 3.5s at most) until the open job has loaded and stopped changing.
    // The previous read is kept on the page (this script's own scope), so a description that has not changed
    // although the job id has is recognised as the old job still showing.
    const w = window as unknown as { __applierLast?: { id: string; desc: string } };
    const prev = w.__applierLast;
    let d = findDescription();
    if (jobId()) {
      let last = "";
      for (let i = 0; i < 12; i++) {
        const now = d ? d.innerText.trim() : "";
        const oldJob = !!d && (stale(d) || (!!prev && prev.id !== jobId() && prev.desc === now));
        if (d && now.length > 200 && now === last && !oldJob) break;
        last = now;
        await new Promise((r) => setTimeout(r, 300));
        d = findDescription();
      }
    }
    if (!d) return null;
    w.__applierLast = { id: jobId(), desc: d.innerText.trim() };

    const id = jobId();
    const pane = paneOf(d);
    const onViewPage = /^\/jobs\/view\//.test(location.pathname);
    const titleParts = document.title.replace(/^\(\d+\+?\)\s*/, "").split(" | "); // "Role | Company | LinkedIn"
    // The open job's card in the list reads "Selected, <role>", then the role again, then the company.
    const lines = (document.body.innerText || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const at = lines.findIndex((l) => /^Selected, \S/.test(l));
    const cardTitle = at < 0 ? "" : lines[at].replace(/^Selected, /, "").replace(/\s*\(Verified job\)$/i, "").trim();
    const cardCompany = at < 0 ? "" : lines.slice(at + 1, at + 3).find((l) => l !== cardTitle && !/\(Verified job\)$/i.test(l)) ?? "";
    const title =
      line(first([".job-details-jobs-unified-top-card__job-title", ".jobs-unified-top-card__job-title", ".top-card-layout__title", ".topcard__title"])) ||
      line(pane?.querySelector("h1")) ||
      cardTitle ||
      (id ? line(document.querySelector(`a[href*="/jobs/view/${id}"]`)) : "") ||
      (onViewPage ? line(document.querySelector("h1")) || (titleParts.length >= 3 ? titleParts[0].trim() : "") : "");
    const company =
      line(first([".job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name", ".topcard__org-name-link"])) ||
      line(Array.from(pane?.querySelectorAll('a[href*="/company/"]') ?? []).find((a) => (a.textContent || "").trim())) ||
      (cardTitle && cardTitle === title ? cardCompany : "") ||
      (onViewPage && titleParts.length >= 3 ? titleParts[1].trim() : "");
    return { title, company, description: clean(d.innerText), url: id ? `https://www.linkedin.com/jobs/view/${id}/` : location.href };
  };
  const li = structured ? null : await linkedIn();
  if (li?.title) structured = { title: li.title, hiringOrganization: li.company, description: li.description };

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
  if (li && li.description.length > 200) text = li.description; // only the open job, not the list beside it

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

  return { url: li?.url ?? location.href, title: document.title, text: text.slice(0, 15000), structured, signals };
}

export async function readActiveTab(): Promise<PageData | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) return null; // chrome://, web store, etc.
  let top: PageData | null;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
    top = (res?.result as PageData) ?? null;
  } catch {
    return null;
  }
  if (!top || top.structured || top.text.length >= 1500) return top;

  // A nearly empty page often shows the job inside an embedded frame (company career sites that embed their
  // applicant tracking system). Use the frame's content, keeping this tab's address and title.
  try {
    const frames = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: readPage });
    const inner = frames
      .filter((f) => f.frameId !== 0 && f.result)
      .map((f) => f.result as PageData)
      .sort((a, b) => Number(!!b.structured) - Number(!!a.structured) || b.text.length - a.text.length)[0];
    if (inner && (inner.structured || inner.text.length > Math.max(500, top.text.length * 2))) {
      return { ...top, text: inner.text, structured: inner.structured, signals: inner.signals };
    }
  } catch { /* a frame that cannot be read: keep what the page itself gave */ }
  return top;
}
