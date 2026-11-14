import type { Usage } from "../api/types";

/** Compact "remaining/total" pill. Outline when fine, heavier as credits run down. */
export function UsagePill({ usage }: { usage: Usage }) {
  const heavy = usage.level === "low" || usage.level === "empty";
  const cls = heavy ? "bg-black text-white border-black" : usage.level === "moderate" ? "border-black" : "border-gray-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[12px] ${cls}`} title={`${usage.used} of ${usage.total} credits used`}>
      {usage.remaining}/{usage.total}
    </span>
  );
}

const COPY = {
  moderate: { title: "Credits moderate", cta: "Buy credits" },
  low: { title: "Credits low. Upgrade now", cta: "Upgrade now" },
  empty: { title: "You're out of credits", cta: "Buy credits" },
} as const;

/** Shown on every screen once half the credits are used; turns solid black when low or empty. */
export function CreditsBanner({ usage, onBuy }: { usage: Usage; onBuy: () => void }) {
  if (usage.level === "ok") return null;
  const copy = COPY[usage.level];
  const solid = usage.level !== "moderate";
  const used = Math.min(100, Math.round((usage.used / Math.max(1, usage.total)) * 100));
  return (
    <div className={`mx-4 mt-4 rounded border p-3 ${solid ? "border-black bg-black text-white" : "border-black bg-white text-black"}`} role="status">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight">{copy.title}</div>
          <div className={`text-[12px] ${solid ? "text-gray-400" : "text-gray-500"}`}>
            {usage.remaining === 0 ? `All ${usage.total} credits used.` : `${usage.remaining} of ${usage.total} left.`}
          </div>
        </div>
        <button onClick={onBuy}
          className={`btn shrink-0 px-3 py-1.5 text-[12px] ${solid ? "border-transparent bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-600"}`}>
          {copy.cta}
        </button>
      </div>
      <div className={`mt-2 h-1 w-full overflow-hidden rounded-full ${solid ? "bg-gray-600" : "bg-gray-200"}`} aria-hidden>
        <div className={`h-full ${solid ? "bg-white" : "bg-black"}`} style={{ width: `${used}%` }} />
      </div>
    </div>
  );
}
