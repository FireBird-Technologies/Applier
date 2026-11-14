import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Application, Format, Resume, SourceDoc } from "../api/types";
import { Logo } from "../sidepanel/Logo";
import { ResumePreview } from "../sidepanel/ResumePreview";
import { EDIT_STEPS, PARSE_STEPS, TailoringLoader } from "../sidepanel/TailoringLoader";
import { ResumeForm } from "./ResumeForm";

const FORMATS: Format[] = ["pdf", "docx", "md", "txt"];
const Label = ({ children }: { children: string }) => (
  <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">{children}</div>
);

/** What the editor needs, whether it is editing a tailored resume or the user's source resume. */
interface Doc {
  title: string;
  resume: Resume;
  version: number;
  canUndo: boolean;
  lastEdit: string;
  applied: boolean;
  notice: string;
}
const fromApp = (a: Application): Doc => ({
  title: [a.job_title, a.company].filter(Boolean).join(" at ") || "Tailored resume", resume: a.resume, version: a.version,
  canUndo: !!a.can_undo, lastEdit: a.last_edit ?? "", applied: a.status === "applied", notice: a.notice ?? "",
});
const fromSource = (d: SourceDoc): Doc => ({
  title: d.filename, resume: d.resume, version: d.version, canUndo: d.can_undo, lastEdit: d.last_edit, applied: false, notice: d.notice ?? "",
});

function makeIo(isSource: boolean, id: number) {
  return isSource
    ? {
        get: async () => fromSource(await api.getSourceDoc()),
        save: async (r: Resume) => fromSource(await api.saveSourceDoc(r)),
        edit: async (i: string) => fromSource(await api.editSourceDoc(i)),
        undo: async () => fromSource(await api.undoSourceDoc()),
      }
    : {
        get: async () => fromApp(await api.getApplication(id)),
        save: async (r: Resume) => fromApp(await api.saveResume(id, r)),
        edit: async (i: string) => fromApp(await api.edit(id, i)),
        undo: async () => fromApp(await api.undo(id)),
      };
}

/**
 * Full-tab editor with two tabs at the top: Edit and Preview. Each takes the whole window.
 * Opened from the side panel: the enlarge icon on a tailored resume, or the eye icon for the source resume.
 */
export function EditorPage() {
  const params = new URLSearchParams(location.search);
  const isSource = params.has("source");
  const id = Number(params.get("id"));
  const io = useMemo(() => makeIo(isSource, id), [isSource, id]);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [draft, setDraft] = useState<Resume | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "edit" | "undo" | Format>("");
  const [instruction, setInstruction] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const adopt = (d: Doc) => { setDoc(d); setDraft(d.resume); };

  useEffect(() => {
    if (!isSource && !id) { setError("No resume selected."); return; }
    io.get().then(adopt).catch((e: Error) => setError(e.message.includes("authenticated") || e.message.includes("token")
      ? "Open the Applier side panel and sign in, then try again." : e.message));
  }, [io, isSource, id]);

  const dirty = !!doc && !!draft && JSON.stringify(draft) !== JSON.stringify(doc.resume);

  // The side panel listens for these and refreshes (preview, status, credits, or the source resume's size).
  const announce = (notice = "") => {
    const payload: Record<string, unknown> = isSource
      ? { applier_source_saved: { ts: Date.now() } }
      : { applier_resume_saved: { id, notice, ts: Date.now() } };
    return chrome.storage.local.set(payload);
  };

  /** Save pending hand edits. Everything below calls this first so files and AI edits match what you see. */
  const persist = async () => {
    if (!dirty || !draft) return null;
    const saved = await io.save(draft);
    adopt(saved);
    return saved;
  };

  const run = async (kind: typeof busy, ok: string, fn: () => Promise<void>) => {
    setBusy(kind); setMessage("");
    try { await fn(); setMessage(ok); } catch (e) { setMessage((e as Error).message); } finally { setBusy(""); }
  };

  const save = () => run("save", "Saved", async () => {
    const saved = await persist();
    await announce(saved?.notice);
    if (saved?.notice) setMessage(saved.notice);
  });
  const ask = () => run("edit", "Updated", async () => {
    await persist();
    adopt(await io.edit(instruction));
    setInstruction("");
    await announce();
  });
  // Unsaved typing is reverted first (like a normal undo); otherwise the last saved edit is stepped back.
  const undo = () => {
    if (dirty && doc) { setDraft(doc.resume); setMessage("Reverted unsaved changes"); return; }
    return run("undo", "Undone", async () => { adopt(await io.undo()); await announce(); });
  };
  const download = (f: Format) => run(f, "Downloaded", async () => {
    await persist();
    await api.download(id, f);
    setDoc((d) => (d ? { ...d, applied: true } : d));
    await announce();
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (dirty && !busy) save(); } };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  });

  if (error) return <div className="mx-auto max-w-md p-16 text-center text-[15px] text-gray-500">{error}</div>;
  if (!doc || !draft) {
    // The source resume is read into sections by the AI the first time it is opened, which takes a moment.
    return isSource
      ? <TailoringLoader title="" company="" steps={PARSE_STEPS} verb="Reading" hint="First time only. Keep this tab open." />
      : <div className="p-16 text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen text-[15px]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-8 py-4">
          <div className="flex min-w-0 items-center gap-5">
            <Logo size={20} />
            <span className="truncate text-[16px] font-medium tracking-tight">{doc.title}</span>
            {isSource ? (
              <span className="shrink-0 rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-medium">Source resume</span>
            ) : (
              <span className={`shrink-0 rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-medium ${doc.applied ? "bg-black text-white" : ""}`}>
                {doc.applied ? "Applied" : "Draft"}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-6 text-[14px]">
            <span className="text-gray-400" role="status">{dirty ? "Unsaved changes" : message}</span>
            <button className="text-gray-500 hover:text-black disabled:text-gray-300 disabled:hover:text-gray-300"
              disabled={(!dirty && !doc.canUndo) || !!busy} onClick={undo}
              title={dirty ? "Discard unsaved changes" : doc.canUndo ? `Undo: ${doc.lastEdit}` : "Nothing to undo"}>
              {busy === "undo" ? "Undoing..." : "Undo"}
            </button>
            <button className="font-medium disabled:text-gray-300" disabled={!dirty || !!busy} onClick={save}>{busy === "save" ? "Saving..." : "Save"}</button>
            <button className="text-gray-500 hover:text-black" onClick={() => window.close()}>Close</button>
          </div>
        </div>
        <nav className="flex gap-1 px-8 pb-3" aria-label="Editor view" role="tablist">
          {(["edit", "preview"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-[14px] capitalize ${tab === t ? "bg-gray-100 font-medium text-black" : "text-gray-500 hover:text-black"}`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {busy === "edit" ? (
        <TailoringLoader title={isSource ? "" : doc.title} company="" steps={EDIT_STEPS} verb="Editing" hint="Usually just a few seconds. Keep this tab open." />
      ) : tab === "edit" ? (
        <>
          {/* The ask bar spans the whole window */}
          <section className="border-b border-gray-200 bg-white px-8 py-6">
            <div className="flex w-full gap-3">
              <input className="field flex-1 py-4 text-[16px]" value={instruction} placeholder="Ask for a change, e.g. make the summary shorter" disabled={!!busy}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && instruction.trim().length > 2 && ask()} />
              <button className="btn-primary shrink-0 px-8 py-4 text-[15px]" disabled={!!busy || instruction.trim().length < 3} onClick={ask}>Apply</button>
            </div>
          </section>
          {isSource && (
            <p className="mx-auto max-w-3xl px-8 pt-8 text-[13px] text-gray-500">
              This is your base resume. Changes here are what every new tailored resume is built from. Sections you remove are not used when tailoring.
            </p>
          )}
          {/* key remounts the form with the saved text after each save, AI edit or undo */}
          <main className="mx-auto max-w-3xl px-8 py-12">
            <ResumeForm key={doc.version} value={draft} onChange={setDraft} />
          </main>
        </>
      ) : (
        <main className="mx-auto max-w-3xl space-y-10 px-8 py-12">
          {!isSource && (
            <section>
              <Label>Download</Label>
              <div className="grid grid-cols-4 gap-3">
                {FORMATS.map((f) => (
                  <button key={f} className="btn-primary py-4 text-[15px] uppercase" disabled={!!busy} onClick={() => download(f)}>
                    {busy === f ? "..." : f}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-gray-500">
                {doc.applied ? "Counted as applied. More downloads and edits are free." : "Downloading marks this job as applied and uses 1 credit."}
              </p>
            </section>
          )}
          <section>
            <ResumePreview r={draft} full />
            <p className="mt-3 text-[13px] text-gray-400">
              {isSource ? "How your base resume reads, section by section." : "Kept to one page. If an edit makes it too long, the least important items are trimmed when you save."}
            </p>
          </section>
        </main>
      )}
    </div>
  );
}
