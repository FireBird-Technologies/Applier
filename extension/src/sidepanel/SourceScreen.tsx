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
        <p className="max-w-[260px] text-[13px] leading-relaxed text-gray-600">
          Next, open a job posting on any job website. Applier detects it automatically and offers to tailor this resume.
        </p>
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
          <button className="shrink-0 p-1 text-gray-500 hover:text-black" onClick={onView} aria-label="View and edit source resume" title="View and edit source resume">
            <EyeIcon size={18} />
          </button>
        </div>
      )}

      <input ref={file} type="file" accept=".pdf,.docx,.md,.txt" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // so choosing the same file again still fires
          if (f) run(() => api.uploadSource(f));
        }} />
      <button className="flex w-full flex-col items-center gap-1 rounded border border-dashed border-gray-400 py-8 hover:bg-gray-100" disabled={busy}
        onClick={() => file.current?.click()}>
        <span className="font-medium">{busy ? "Reading..." : "Choose a file"}</span>
        <span className="text-gray-500">PDF, DOCX, MD or TXT, up to 5 MB</span>
      </button>

      {error && <p className="border-l-2 border-black pl-2">{error}</p>}
      {onCancel && <button className="btn-ghost w-full" onClick={onCancel}>Cancel</button>}
    </div>
  );
}
