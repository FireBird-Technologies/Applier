import { useRef, useState } from "react";
import { api } from "../api/client";
import type { SourceResume } from "../api/types";

interface Props {
  current: SourceResume | null;
  onSaved: (s: SourceResume) => void;
  onCancel?: () => void;
}

export function SourceScreen({ current, onSaved, onCancel }: Props) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<SourceResume>) => {
    setBusy(true); setError("");
    try { onSaved(await fn()); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{current ? "Replace source resume" : "Add your source resume"}</h2>
        <p className="mt-1 text-gray-500">This is the base document every tailored resume is built from. Only facts in it are used.</p>
      </div>

      {current && (
        <div className="card">
          <div className="label">Current</div>
          <div className="font-medium">{current.filename}</div>
          <div className="text-gray-500">{current.chars.toLocaleString()} characters</div>
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
          <button className="flex w-full flex-col items-center gap-1 rounded border border-dashed border-gray-400 py-8 hover:border-black" disabled={busy}
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
