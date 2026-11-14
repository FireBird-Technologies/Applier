"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

interface Job {
  tab: string;
  company: string;
  role: string;
  url: string;
  posting: string;
  keywords: string[];
  matched: string[];
  missing: string[]; // requirements the sample resume does not support: shown as NOT claimed
  bullets: string[];
  skills: string[];
}

// One sample person, one set of facts. Each job re-orders and re-words the same facts. Nothing is invented.
const JOBS: Job[] = [
  {
    tab: "Backend Engineer", company: "Northwind", role: "Backend Engineer", url: "northwind.example/careers/backend-engineer",
    posting: "We are hiring a Backend Engineer to build and scale the REST APIs behind our payments product. You will own performance, write Python every day, and lead a small team.",
    keywords: ["REST APIs", "performance", "Python", "lead a small team"],
    matched: ["REST APIs", "performance", "Python", "lead a small team"], missing: [],
    bullets: [
      "Built and maintained REST APIs in Python for a payments platform.",
      "Cut report generation time from 6 minutes to 40 seconds by adding caching.",
      "Led a team of 4 engineers and ran weekly planning.",
    ],
    skills: ["Python", "REST APIs", "Caching"],
  },
  {
    tab: "Product Designer", company: "Lumen", role: "Product Designer", url: "lumen.example/jobs/product-designer",
    posting: "We are hiring a Product Designer to shape our onboarding. You will run usability tests, turn user research into screens, and plan work with a small team.",
    keywords: ["onboarding", "usability tests", "user research"],
    matched: ["onboarding", "usability tests"], missing: ["user research"],
    bullets: [
      "Designed the onboarding screens and ran usability tests with 12 users.",
      "Ran weekly planning for a team of 4.",
      "Built and maintained REST APIs in Python for a payments platform.",
    ],
    skills: ["Usability testing", "Onboarding design"],
  },
  {
    tab: "Data Analyst", company: "Parcel", role: "Data Analyst", url: "parcel.example/careers/data-analyst",
    posting: "We are hiring a Data Analyst to dig into customer churn. You will write SQL, present findings to leadership, and build dashboards that people actually use.",
    keywords: ["churn", "SQL", "findings to leadership", "dashboards"],
    matched: ["churn", "SQL", "findings to leadership"], missing: ["dashboards"],
    bullets: [
      "Analyzed churn data in SQL and presented the findings to leadership.",
      "Cut report generation time from 6 minutes to 40 seconds by adding caching.",
      "Ran weekly planning for a team of 4.",
    ],
    skills: ["SQL", "Churn analysis"],
  },
];

const STEPS = ["Reading the job description", "Matching it to your resume", "Keeping it to one page"];
const STEP_MS = 700;
const REVEALS = 5; // header, three bullets, skills

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The posting text with the requirement phrases underlined. */
function Highlighted({ text, keywords }: { text: string; keywords: string[] }) {
  const parts = text.split(new RegExp(`(${keywords.map(escapeRe).join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <span key={i} className="underline decoration-2 underline-offset-4">{p}</span> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

export function HeroDemo() {
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState(0); // 0..2 working steps, 3.. = result with (stage - 3) items revealed
  const timers = useRef<number[]>([]);
  const reduced = useRef(false);
  const job = JOBS[idx];

  const run = useCallback((i: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setIdx(i);
    if (reduced.current) {
      setStage(STEPS.length + REVEALS); // no animation: show the finished resume straight away
      return;
    }
    setStage(0);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    STEPS.forEach((_, s) => at(s * STEP_MS, () => setStage(s)));
    for (let r = 0; r <= REVEALS; r++) at(STEPS.length * STEP_MS + r * 260, () => setStage(STEPS.length + r));
  }, []);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = window.setTimeout(() => run(0), 500);
    return () => {
      clearTimeout(start);
      timers.current.forEach(clearTimeout);
    };
  }, [run]);

  const working = stage < STEPS.length;
  const shown = Math.max(0, stage - STEPS.length); // result items on screen
  const on = (n: number) => (shown >= n ? "on" : "");

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left" id="demo">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
        {[0, 1, 2].map((d) => <span key={d} className="h-2.5 w-2.5 rounded-full border border-neutral-300" />)}
        <span className="mx-auto max-w-[70%] truncate rounded-md bg-neutral-100 px-3 py-1 font-mono text-[11px] text-neutral-500">{job.url}</span>
        <span className="w-[42px]" aria-hidden />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-5 py-3">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">Try a job</span>
        {JOBS.map((j, i) => (
          <button key={j.tab} onClick={() => run(i)} aria-pressed={i === idx}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${i === idx ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
            {j.tab}
          </button>
        ))}
        <button onClick={() => run(idx)} className="ml-auto text-[13px] text-neutral-500 underline-offset-4 hover:text-black hover:underline">Replay</button>
      </div>

      <div className="grid md:grid-cols-2 md:divide-x md:divide-neutral-200">
        {/* the job posting */}
        <div className="space-y-5 p-6 md:p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">Job posting</div>
          <div>
            <div className="text-[20px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{job.role}</div>
            <div className="text-neutral-500">{job.company}</div>
          </div>
          <p className="text-[15px] leading-relaxed text-neutral-700"><Highlighted text={job.posting} keywords={job.keywords} /></p>
          <div className={`step-in space-y-2 ${stage >= 1 ? "on" : ""}`}>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">What they ask for</div>
            <div className="flex flex-wrap gap-2">
              {job.matched.map((k) => (
                <span key={k} className="rounded-full bg-black px-3 py-1 text-[12px] font-medium text-white">&#10003; {k}</span>
              ))}
              {job.missing.map((k) => (
                <span key={k} className="rounded-full border border-dashed border-neutral-400 px-3 py-1 text-[12px] text-neutral-500">{k}: not in your resume, so not claimed</span>
              ))}
            </div>
          </div>
        </div>

        {/* the tailored resume */}
        <div className="space-y-5 border-t border-neutral-200 bg-neutral-50 p-6 md:border-t-0 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">Your tailored resume</div>
            <div className="text-[12px] text-neutral-500" role="status" aria-live="polite">
              {working ? <>{STEPS[stage]}<span className="caret ml-0.5">&#9611;</span></> : "Ready. Fits on one page."}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 md:p-6">
            <div className={`step-in ${on(1)}`}>
              <div className="text-[20px] font-semibold" style={{ letterSpacing: "-0.02em" }}>Jane Doe</div>
              <div className="text-[13px] text-neutral-500">jane@example.com &middot; Remote</div>
              <div className="mb-2 mt-4 border-b border-black pb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">Experience</div>
            </div>
            <ul className="space-y-2.5 text-[14px] leading-snug text-neutral-700">
              {job.bullets.map((b, i) => (
                <li key={b} className={`step-in flex gap-2 ${on(i + 2)}`}><span aria-hidden>&bull;</span><span>{b}</span></li>
              ))}
            </ul>
            <div className={`step-in mt-4 flex flex-wrap gap-1.5 ${on(5)}`}>
              {job.skills.map((s) => <span key={s} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">{s}</span>)}
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-neutral-500">
            Same facts every time, reordered and reworded for each role. Nothing added that is not in the resume.
          </p>
        </div>
      </div>

      <div className="border-t border-neutral-200 px-5 py-3 text-center text-[12px] text-neutral-500">
        An example with a sample person. With Applier, the resume comes from your own.
      </div>
    </div>
  );
}
