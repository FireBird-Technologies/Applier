import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Application, Format, Resume } from "../api/types";
import { Logo } from "../sidepanel/Logo";
import { EDIT_STEPS, TailoringLoader } from "../sidepanel/TailoringLoader";
import { ResumePreview } from "../sidepanel/ResumePreview";
import { ResumeForm } from "./ResumeForm";

const FORMATS: Format[] = ["pdf", "docx", "md", "txt"];
const Label = ({ children }: { children: string }) => (
  <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">{children}</div>
);

/** Full-tab editor: edit on the left; job actions and the page preview on the right. */
export function EditorPage() {
  const id = Number(new URLSearchParams(location.search).get("id"));
  const [app, setApp] = useState<Application | null>(null);
  const [draft, setDraft] = useState<Resume | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "edit" | Format>("");
  const [instruction, setInstruction] = useState("");

  useEffect(() => {
    if (!id) { setError("No resume selected."); return; }
    api.getApplication(id)
      .then((a) => { setApp(a); setDraft(a.resume); })
      .catch((e: Error) => setError(e.message.includes("authenticated") || e.message.includes("token")
        ? "Open the Applier side panel and sign in, then try again." : e.message));
  }, [id]);

  const dirty = !!app && !!draft && JSON.stringify(draft) !== JSON.stringify(app.resume);

  // The side panel listens for this and refreshes its preview, status and credits.
  const announce = (notice = "") => chrome.storage.local.set({ applier_resume_saved: { id, notice, ts: Date.now() } });

  const adopt = (a: Application) => { setApp(a); setDraft(a.resume); };
  /** Save pending hand edits. Everything below calls this first so files and AI edits match what you see. */
  const persist = useCallback(async () => {
    if (!dirty || !draft) return;
    const saved = await api.saveResume(id, draft);
    adopt(saved);
    return saved;
  }, [dirty, draft, id]);

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
    adopt(await api.edit(id, instruction));
    setInstruction("");
    await announce();
  });
  const download = (f: Format) => run(f, "Downloaded", async () => {
    await persist();
    await api.download(id, f);
    setApp((a) => (a ? { ...a, status: "applied" } : a));
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
  if (!app || !draft) return <div className="p-16 text-center text-gray-400">Loading...</div>;

  const title = [app.job_title, app.company].filter(Boolean).join(" at ") || "Tailored resume";
  const applied = app.status === "applied";

  return (
    <div className="min-h-screen text-[15px]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex min-w-0 items-center gap-5">
          <Logo size={20} />
          <span className="truncate text-[16px] font-medium tracking-tight">{title}</span>
          <span className={`shrink-0 rounded-full border border-black px-2.5 py-0.5 text-[11px] font-medium ${applied ? "bg-black text-white" : ""}`}>
            {applied ? "Applied" : "Draft"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-6 text-[14px]">
          <span className="text-gray-400" role="status">{dirty ? "Unsaved changes" : message}</span>
          <button className="font-medium disabled:text-gray-300" disabled={!dirty || !!busy} onClick={save}>{busy === "save" ? "Saving..." : "Save"}</button>
          <button className="text-gray-500 hover:text-black" onClick={() => window.close()}>Close</button>
        </div>
      </header>

      {busy === "edit" ? (
        <TailoringLoader title={app.job_title} company={app.company} steps={EDIT_STEPS} verb="Editing" hint="Usually just a few seconds. Keep this tab open." />
      ) : (
      <main className="mx-auto grid max-w-[1400px] gap-16 px-8 py-12 lg:grid-cols-[1.05fr_1fr]">
        {/* key remounts the form with the saved (possibly trimmed) text after each save or AI edit */}
        <ResumeForm key={app.version} value={draft} onChange={setDraft} />

        <div className="space-y-12 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <section>
            <Label>Ask for a change</Label>
            <div className="flex gap-3">
              <input className="field py-3.5 text-[15px]" value={instruction} placeholder="e.g. Make the summary shorter" disabled={!!busy}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && instruction.trim().length > 2 && ask()} />
              <button className="btn-ghost shrink-0 px-6 py-3.5 text-[15px]" disabled={!!busy || instruction.trim().length < 3} onClick={ask}>
                Apply
              </button>
            </div>
          </section>

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
              {applied ? "Counted as applied. More downloads and edits are free." : "Downloading marks this job as applied and uses 1 credit."}
            </p>
          </section>

          <section>
            <Label>Preview</Label>
            <ResumePreview r={draft} full />
            <p className="mt-3 text-[13px] text-gray-400">Kept to one page. If an edit makes it too long, the least important items are trimmed when you save.</p>
          </section>
        </div>
      </main>
      )}
    </div>
  );
}
