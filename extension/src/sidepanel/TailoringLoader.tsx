import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

export const TAILOR_STEPS = [
  "Reading the job description",
  "Matching it to your experience",
  "Picking the strongest achievements",
  "Rewriting bullets for this role",
  "Polishing the final resume",
];

export const PARSE_STEPS = [
  "Reading your resume",
  "Finding your sections and roles",
  "Getting it ready to edit",
];

export const EDIT_STEPS = [
  "Reading your request",
  "Rewriting the resume",
  "Checking it still fits one page",
];

interface Props {
  title: string;
  company: string;
  steps?: string[];
  verb?: string; // "Tailoring for <role>" / "Editing <role>"
  hint?: string;
}

/** Full-panel loading state shown while the AI works (tailoring a resume, or applying an edit). */
export function TailoringLoader({ title, company, steps = TAILOR_STEPS, verb = "Tailoring for", hint = "Usually takes 10 to 30 seconds. Keep this panel open." }: Props) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);

  const target = [title, company].filter(Boolean).join(" at ");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-2 text-center" role="status" aria-live="polite">
      <LogoMark size={40} />

      <div className="w-full max-w-[260px] space-y-3">
        <div className="loader-track" aria-hidden>
          <div className="loader-bar" />
        </div>
        <div key={step} className="fade-in text-[14px] font-medium tracking-tight">
          {steps[step]}
        </div>
        <div className="font-mono text-[11px] text-gray-500">{seconds}s</div>
      </div>

      <div className="space-y-1">
        {target && <div className="max-w-[260px] truncate text-[12px] text-gray-500">{verb} {target}</div>}
        <div className="text-[12px] text-gray-400">{hint}</div>
      </div>
    </div>
  );
}
