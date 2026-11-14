import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Application, Detect, Format, PageData, Usage } from "../api/types";
import { readActiveTab } from "../lib/extract";
import { DownloadBar } from "./DownloadBar";
import { ExpandIcon } from "./Icons";
import { ResumePreview } from "./ResumePreview";
import { EDIT_STEPS, TailoringLoader } from "./TailoringLoader";


interface Props {
  usage: Usage;
  onUsage: () => void;
  onBuy: () => void;
  /** Bumped by the header's Scan button. Each change starts a fresh scan of the current tab. */
  scanTick?: number;
}

export function JobScreen({ usage, onUsage, onBuy, scanTick = 0 }: Props) {
  const [page, setPage] = useState<PageData | null | undefined>(undefined); // undefined = scanning, null = unreadable
  const [det, setDet] = useState<Detect | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [stopped, setStopped] = useState(false); // user cancelled the scan
  const [override, setOverride] = useState<boolean | null>(null); // user's manual "is a job" answer
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState(""); // editable job description; prefilled from the page
  const [app, setApp] = useState<Application | null>(null);
  const [busy, setBusy] = useState<"" | "generate" | "edit" | "undo" | Format>("");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const scanId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // The header's Scan button. (If the user was on another screen, this screen mounts and scans by itself.)
  const firstTick = useRef(true);
  useEffect(() => {
    if (firstTick.current) { firstTick.current = false; return; }
    if (!busyRef.current) scan();  // never wipe a resume that is being generated or edited
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanTick]);

  const scan = useCallback(async () => {
    abort.current?.abort(); // a newer scan supersedes any request still in flight
    const ac = new AbortController();
    abort.current = ac;
    const id = ++scanId.current;
    setDetecting(false); setStopped(false);
    setPage(undefined); setDet(null); setOverride(null); setApp(null); setError(""); setTitle(""); setCompany(""); setJd("");
    const p = await readActiveTab();
    if (id !== scanId.current) return;
    setPage(p);
    if (!p) return;
    setJd(p.text);
    if (ac.signal.aborted) return; // stopped while the page was being read
    setDetecting(true);
    try {
      const d = await api.detect(p, ac.signal);
      if (id !== scanId.current) return;
      setDet(d); setTitle(d.job_title); setCompany(d.company);
    } catch (e) {
      if (id === scanId.current && !ac.signal.aborted) setError((e as Error).message);
    } finally {
      if (id === scanId.current) setDetecting(false);
    }
  }, []);

  // Rescan on open and whenever the active tab or its URL changes (debounced; never mid-generation).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const later = () => { clearTimeout(t); t = setTimeout(() => { if (!busyRef.current) scan(); }, 600); };
    const onUpdated = (_: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (tab.active && (info.url || info.status === "complete")) later();
    };
    scan();
    chrome.tabs.onActivated.addListener(later);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => { clearTimeout(t); chrome.tabs.onActivated.removeListener(later); chrome.tabs.onUpdated.removeListener(onUpdated); };
  }, [scan]);

  const stopScan = () => {
    abort.current?.abort();
    setStopped(true);
    setDetecting(false);
  };

  // The side panel cannot be resized by an extension, so Enlarge opens a full-tab editor instead.
  const openEditor = () => chrome.tabs.create({ url: chrome.runtime.getURL(`editor.html?id=${app!.id}`) });

  // The editor tab announces saves through storage; reload the resume it changed.
  const appId = app?.id;
  useEffect(() => {
    if (!appId) return;
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const saved = changes.applier_resume_saved?.newValue;
      if (area === "local" && saved?.id === appId) {
        api.getApplication(appId).then((a) => setApp({ ...a, notice: saved.notice || "" })).catch(() => {});
        onUsage(); // the editor tab may have downloaded, which uses a credit
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [appId, onUsage]);

  const isJob = override ?? det?.is_job ?? false;
  const host = page ? new URL(page.url).hostname : "";

  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind); setError("");
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };

  const generate = () => run("generate", async () => {
    setApp(await api.generate({ ...page!, text: jd }, title, company));
    onUsage(); // generating is what spends the credit
  });
  const edit = () => run("edit", async () => { setApp(await api.edit(app!.id, instruction)); setInstruction(""); });
  const undo = () => run("undo", async () => setApp(await api.undo(app!.id)));
  const download = (f: Format) => run(f, async () => {
    await api.download(app!.id, f);
    setApp({ ...app!, status: "applied" });
    onUsage();
  });

  // While tailoring, replace the whole form with the loading screen.
  if (busy === "generate") return <TailoringLoader title={title} company={company} />;
  if (busy === "edit" && app) {
    return <TailoringLoader title={app.job_title} company={app.company} steps={EDIT_STEPS} verb="Editing" hint="Usually just a few seconds. Keep this panel open." />;
  }

  if (page === undefined) {
    return (
      <div className="space-y-2 text-center">
        <Status>Reading page...</Status>
        {!stopped && <button className="btn-ghost px-3 py-1 text-[12px]" onClick={stopScan}>Stop</button>}
      </div>
    );
  }
  if (page === null) return <Status>This page can't be read. Open a job posting in a normal tab.</Status>;

  return (
    <div className="space-y-4">
      <div className="card flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="label">Current page</div>
          <div className="truncate font-medium">{page.title || host}</div>
          <div className="truncate text-gray-500">{host}</div>
        </div>
        <button className="btn-ghost shrink-0 px-2 py-1 text-[12px]" onClick={scan} disabled={!!busy}>Rescan</button>
      </div>

      {detecting && (
        <div className="space-y-2 text-center">
          <Status>Checking if this is a job posting...</Status>
          <button className="btn-ghost px-3 py-1 text-[12px]" onClick={stopScan}>Stop scan</button>
        </div>
      )}

      {!detecting && !app && !isJob && (
        <div className="space-y-3">
          <p>{stopped ? "Scan stopped." : det ? `This doesn't look like a job posting. ${det.reason}` : "Couldn't check this page."}</p>
          <p className="text-[12px] text-gray-500">Open a job posting and Applier detects it automatically.</p>
          <button className="btn-ghost w-full" onClick={() => setOverride(true)}>This is a job page</button>
        </div>
      )}

      {!detecting && !app && isJob && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-black" />
              {override ? "Marked as a job page" : `Job detected (${Math.round((det?.confidence ?? 0) * 100)}%)`}
            </span>
            <button className="text-[12px] text-gray-500 underline" onClick={() => setOverride(false)}>Not a job?</button>
          </div>
          <div><label className="label">Role</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" /></div>
          <div><label className="label">Company</label><input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" /></div>
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <label className="label mb-0 inline">Job description</label>
                <span className="ml-2 text-[11px] text-gray-400">The system cleans this text to remove anything unnecessary.</span>
              </div>
              <span className="shrink-0 text-[11px] text-gray-400">{jd.length.toLocaleString()} chars</span>
            </div>
            <textarea className="field h-44 resize-y text-[12px] leading-snug" value={jd} onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here" />
            {jd.trim().length < 100 && <p className="mt-1 text-[12px] text-gray-500">Add at least a few sentences of the job description.</p>}
          </div>
          {usage.paywalled ? (
            <div className="space-y-2">
              <p className="border-l-2 border-black pl-2">
                You're out of credits. ${usage.price_per_application_usd.toFixed(2)} per application, ${usage.minimum_charge_usd.toFixed(2)} minimum.
              </p>
              <button className="btn-primary w-full" onClick={onBuy}>Buy credits</button>
            </div>
          ) : (
            <button className="btn-primary w-full" disabled={!!busy || jd.trim().length < 100} onClick={generate}>
              Generate tailored resume
            </button>
          )}
          {!usage.paywalled && <p className="text-center text-[12px] text-gray-500">Uses 1 credit. Edits and downloads are free.</p>}
        </div>
      )}

      {app && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="truncate font-medium">{app.job_title || "Tailored resume"}</div>
              <div className="truncate text-gray-500">{app.company}</div>
            </div>
            <span className={`rounded-full border border-black px-2 py-0.5 text-[11px] font-medium ${app.status === "applied" ? "bg-black text-white" : ""}`}>
              {app.status === "applied" ? "Applied" : "Draft"}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Preview (1 page)</label>
              <button className="p-1 text-gray-500 hover:text-black" onClick={openEditor}
                aria-label="Enlarge and edit resume" title="Enlarge and edit">
                <ExpandIcon size={18} />
              </button>
            </div>
            <ResumePreview r={app.resume} />
            {app.notice && <p className="border-l-2 border-black pl-2 text-[12px]">{app.notice}</p>}
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="label">Suggest an edit</label>
              <button className="mb-1 text-[12px] text-gray-500 hover:text-black disabled:text-gray-300 disabled:hover:text-gray-300"
                disabled={!app.can_undo || !!busy} onClick={undo}
                title={app.can_undo ? `Undo: ${app.last_edit}` : "Nothing to undo"}>
                {busy === "undo" ? "Undoing..." : "Undo"}
              </button>
            </div>
            <div className="flex gap-2">
              <input className="field" value={instruction} placeholder="e.g. Shorten the summary" disabled={!!busy}
                onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => e.key === "Enter" && instruction.trim().length > 2 && edit()} />
              <button className="btn-ghost shrink-0" disabled={!!busy || instruction.trim().length < 3} onClick={edit}>
                {busy === "edit" ? "..." : "Apply"}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Download</label>
            <DownloadBar busy={busy} onDownload={download} />
            <p className="mt-2 text-[12px] text-gray-500">1 credit used for this resume. Edits and downloads are free.</p>
          </div>
        </div>
      )}

      {error && <p className="border-l-2 border-black pl-2">{error}</p>}
    </div>
  );
}

const Status = ({ children }: { children: React.ReactNode }) => <p className="py-6 text-center text-gray-500">{children}</p>;
