import type { Format } from "../api/types";

const FORMATS: Format[] = ["pdf", "docx", "md", "txt"];

interface Props {
  busy: string; // the format being downloaded, or "" / another action
  disabled?: boolean;
  onDownload: (f: Format) => void;
  /** A touch roomier for the full-tab editor. */
  roomy?: boolean;
}

/** Small, quiet download chips: light gray, turning black on hover. No borders. */
export function DownloadBar({ busy, disabled, onDownload, roomy = false }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Download">
      {FORMATS.map((f) => (
        <button key={f} disabled={disabled || !!busy} onClick={() => onDownload(f)} aria-label={`Download ${f.toUpperCase()}`}
          className={`rounded-full bg-gray-100 font-medium uppercase tracking-wider text-gray-600 transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-100 disabled:hover:text-gray-600 ${roomy ? "px-4 py-1.5 text-[12px]" : "px-3 py-1 text-[11px]"}`}>
          {busy === f ? "..." : f}
        </button>
      ))}
    </div>
  );
}
