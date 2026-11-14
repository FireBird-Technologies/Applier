import type { Resume } from "../api/types";

const H = ({ children }: { children: string }) => (
  <h4 className="mb-1 mt-3 border-b border-black pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider">{children}</h4>
);
const Bullets = ({ items }: { items: string[] }) =>
  items.length ? <ul className="ml-4 list-disc text-[12px] text-gray-600">{items.map((b, i) => <li key={i}>{b}</li>)}</ul> : null;

export function ResumePreview({ r }: { r: Resume }) {
  return (
    <div className="card max-h-[340px] overflow-y-auto text-[12px]">
      <div className="text-[15px] font-semibold tracking-tight">{r.name}</div>
      {r.headline && <div>{r.headline}</div>}
      {r.contact.length > 0 && <div className="text-gray-500">{r.contact.join("  |  ")}</div>}
      {r.summary && (<><H>Summary</H><p className="text-gray-600">{r.summary}</p></>)}
      {r.skills.length > 0 && (<><H>Skills</H><p className="text-gray-600">{r.skills.join(", ")}</p></>)}
      {r.experience.length > 0 && <H>Experience</H>}
      {r.experience.map((e, i) => (
        <div key={i} className="mb-2">
          <div className="font-medium">{[e.title, e.company].filter(Boolean).join(" - ")}</div>
          <div className="text-gray-500">{[e.location, [e.start, e.end].filter(Boolean).join(" - ")].filter(Boolean).join(" | ")}</div>
          <Bullets items={e.bullets} />
        </div>
      ))}
      {r.projects.length > 0 && <H>Projects</H>}
      {r.projects.map((p, i) => (<div key={i} className="mb-1"><div className="font-medium">{p.name}</div><Bullets items={p.bullets} /></div>))}
      {r.education.length > 0 && <H>Education</H>}
      {r.education.map((e, i) => (
        <div key={i} className="mb-1">
          <div className="font-medium">{[e.degree, e.school].filter(Boolean).join(" - ")}</div>
          <div className="text-gray-500">{e.dates}</div>
          <Bullets items={e.details} />
        </div>
      ))}
      {r.certifications.length > 0 && (<><H>Certifications</H><Bullets items={r.certifications} /></>)}
    </div>
  );
}
