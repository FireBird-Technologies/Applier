import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { SourceResume } from "../api/types";
import { EyeIcon, SuccessTick } from "./Icons";

interface Props {
  current: SourceResume | null;
  onSaved: (s: SourceResume) => void;
  onView: () => void;
  onCancel?: () => void;
}

export function SourceScreen({ current, onSaved, onView, onCancel }: Props) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SourceResume | null>(null); // set => show the success tick
  const file = useRef<HTMLInputElement>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Hold the success state for a moment, then continue on to the job screen.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => onSavedRef.current(saved), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  const run = async (fn: () => Promise<SourceResume>) => {
    setBusy(true); setError("");
    try { setSaved(await fn()); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (saved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" role="status">
        <SuccessTick />
        <div>
          <div className="text-[16px] font-semibold tracking-tight">{current ? "Resume updated" : "Resume saved"}</div>
          <div className="mt-0.5 max-w-[260px] truncate text-gray-500">{saved.filename}</div>
          <div className="text-[12px] text-gray-400">{saved.chars.toLocaleString()} characters read</div>
        </div>
        <button className="btn-primary" onClick={() => onSaved(saved)}>Continue</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{current ? "Replace source resume" : "Add your source resume"}</h2>
        <p className="mt-1 text-gray-500">This is the base document every tailored resume is built from. Only facts in it are used.</p>
      </div>

      {current && (
        <div className="card flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="label">Current</div>
            <div className="truncate font-medium">{current.filename}</div>
            <div className="text-gray-500">{current.chars.toLocaleString()} characters</div>
          </div>
          <button className="shrink-0 p-1 text-gray-500 hover:text-black" onClick={onView} aria-label="View source resume" title="View source resume">
            <EyeIcon size={18} />
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {(["upload", "paste"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`-mb-px border-b-2 px-2 pb-2 text-[13px] ${mode === m ? "border-black font-medium" : "border-transparent text-gray-500"}`}>
            {m === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <>
          <input ref={file} type="file" accept=".pdf,.docx,.md,.txt" className="hidden"
            onChange={(e) => e.target.files?.[0] && run(() => api.uploadSource(e.target.files![0]))} />
          <button className="flex w-full flex-col items-center gap-1 rounded border border-dashed border-gray-400 py-8 hover:bg-gray-100" disabled={busy}
            onClick={() => file.current?.click()}>
            <span className="font-medium">{busy ? "Reading..." : "Choose a file"}</span>
            <span className="text-gray-500">PDF, DOCX, MD or TXT, up to 5 MB</span>
          </button>
        </>
      ) : (
        <>
          <textarea className="field h-48 resize-none font-mono text-[12px]" placeholder="Paste your resume text here"
            value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy || text.trim().length < 80} onClick={() => run(() => api.pasteSource(text))}>
            {busy ? "Saving..." : "Save resume"}
          </button>
        </>
      )}

      {error && <p className="border-l-2 border-black pl-2">{error}</p>}
      {onCancel && <button className="btn-ghost w-full" onClick={onCancel}>Cancel</button>}
    </div>
  );
}
