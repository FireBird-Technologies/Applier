import { useState } from "react";

export type Rating = "up" | "down" | null | undefined;

const Thumb = ({ down = false, filled }: { down?: boolean; filled: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {down ? (
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    ) : (
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    )}
  </svg>
);

interface Props {
  value: Rating;
  /** Called with the new rating; null takes it back. */
  onRate: (r: "up" | "down" | null) => Promise<void>;
}

/** Thumbs up/down on a generated resume. Clicking the same thumb again takes the rating back. */
export function Feedback({ value, onRate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const click = async (r: "up" | "down") => {
    setBusy(true); setError("");
    try { await onRate(value === r ? null : r); } catch { setError("Could not save that. Try again."); } finally { setBusy(false); }
  };

  const btn = (r: "up" | "down", label: string) => (
    <button disabled={busy} onClick={() => click(r)} aria-label={label} aria-pressed={value === r} title={label}
      className={`rounded p-1.5 transition-colors disabled:opacity-40 ${value === r ? "text-black" : "text-gray-400 hover:text-black"}`}>
      <Thumb down={r === "down"} filled={value === r} />
    </button>
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[12px] text-gray-500">How was this resume?</span>
        {btn("up", "Good resume")}
        {btn("down", "Not good")}
      </div>
      {value && <p className="text-[12px] text-gray-500" role="status">Thanks! The system will use this to improve.</p>}
      {error && <p className="text-[12px] text-gray-500">{error}</p>}
    </div>
  );
}
