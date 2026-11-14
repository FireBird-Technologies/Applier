import { useEffect, useState } from "react";
import { api } from "../api/client";
import { CloseIcon } from "./Icons";

/** Read-only, full-panel view of the user's source resume text. */
export function SourceViewer({ onClose }: { onClose: () => void }) {
  const [doc, setDoc] = useState<{ filename: string; text: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api.getSourceContent().then(setDoc).catch((e) => setError((e as Error).message)); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-label="Source resume">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <div className="label mb-0">Source resume</div>
          <div className="truncate font-medium">{doc?.filename ?? "Loading..."}</div>
        </div>
        <button className="btn-ghost px-2 py-1.5" onClick={onClose} aria-label="Close"><CloseIcon /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {error ? <p className="border-l-2 border-black pl-2">{error}</p> : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-gray-600">{doc?.text ?? ""}</pre>
        )}
      </div>
      {doc && <div className="border-t border-gray-200 px-4 py-2 text-[12px] text-gray-500">{doc.text.length.toLocaleString()} characters</div>}
    </div>
  );
}
