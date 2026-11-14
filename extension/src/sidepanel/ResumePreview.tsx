import { Fragment, type ReactNode } from "react";
import { SECTION_KEYS, type Resume, type SectionKey } from "../api/types";

const TITLES: Record<SectionKey, string> = {
  summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education", certifications: "Certifications",
};

const H = ({ children }: { children: string }) => (
  <h4 className="mb-1 mt-3 border-b border-black pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider">{children}</h4>
);
const Bullets = ({ items }: { items: string[] }) =>
  items.length ? <ul className="ml-4 list-disc text-gray-600">{items.map((b, i) => <li key={i}>{b}</li>)}</ul> : null;

function body(r: Resume, k: SectionKey): ReactNode {
  switch (k) {
    case "summary":
      return r.summary ? <p className="text-gray-600">{r.summary}</p> : null;
    case "skills":
      return r.skills.length ? <p className="text-gray-600">{r.skills.join(", ")}</p> : null;
    case "experience":
      return r.experience.length ? r.experience.map((e, i) => (
        <div key={i} className="mb-2">
          <div className="font-medium">{[e.title, e.company].filter(Boolean).join(" - ")}</div>
          <div className="text-gray-500">{[e.location, [e.start, e.end].filter(Boolean).join(" - ")].filter(Boolean).join(" | ")}</div>
          <Bullets items={e.bullets} />
        </div>
      )) : null;
    case "projects":
      return r.projects.length ? r.projects.map((p, i) => <div key={i} className="mb-1"><div className="font-medium">{p.name}</div><Bullets items={p.bullets} /></div>) : null;
    case "education":
      return r.education.length ? r.education.map((e, i) => (
        <div key={i} className="mb-1">
          <div className="font-medium">{[e.degree, e.school].filter(Boolean).join(" - ")}</div>
          <div className="text-gray-500">{e.dates}</div>
          <Bullets items={e.details} />
        </div>
      )) : null;
    case "certifications":
      return r.certifications.length ? <Bullets items={r.certifications} /> : null;
  }
}

export function ResumePreview({ r, full = false }: { r: Resume; full?: boolean }) {
  const order = (r.section_order ?? [...SECTION_KEYS]) as SectionKey[]; // older resumes have no layout: show everything
  return (
    <div className={`card ${full ? "p-10 text-[13px]" : "max-h-[340px] overflow-y-auto text-[12px]"}`}>
      <div className={`${full ? "text-[22px]" : "text-[15px]"} font-semibold tracking-tight`}>{r.name}</div>
      {r.headline && <div>{r.headline}</div>}
      {r.contact.length > 0 && <div className="text-gray-500">{r.contact.join("  |  ")}</div>}
      {order.map((k) => {
        const content = body(r, k);
        return content ? <Fragment key={k}><H>{TITLES[k]}</H>{content}</Fragment> : null;
      })}
    </div>
  );
}
