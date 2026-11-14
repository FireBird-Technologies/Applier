import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Resume } from "../api/types";

type Exp = Resume["experience"][number];
type Proj = Resume["projects"][number];
type Edu = Resume["education"][number];

// Borderless fields that read like the document. A hairline appears on hover, black on focus.
const field = "w-full bg-transparent py-1 outline-none border-b border-transparent hover:border-gray-200 focus:border-black placeholder:text-gray-400";

/** Textarea that grows with its content. One item per line. */
function Area({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
    className={`${field} resize-none overflow-hidden leading-relaxed ${className}`} />;
}
const Lines = (p: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; className?: string }) => (
  <Area value={p.value.join("\n")} onChange={(v) => p.onChange(v.split("\n"))} placeholder={p.placeholder} className={p.className} />
);

const Section = ({ title, onAdd, children }: { title: string; onAdd?: () => void; children: ReactNode }) => (
  <section className="space-y-2">
    <div className="flex items-baseline justify-between">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">{title}</h3>
      {onAdd && <button className="text-[13px] text-gray-400 hover:text-black" onClick={onAdd}>+ add</button>}
    </div>
    {children}
  </section>
);
const Entry = ({ onRemove, children }: { onRemove: () => void; children: ReactNode }) => (
  <div className="group relative space-y-1 py-4">
    {children}
    <button className="absolute right-0 top-3 px-1 text-lg text-gray-300 opacity-0 hover:text-black focus:opacity-100 group-hover:opacity-100"
      onClick={onRemove} aria-label="Remove" title="Remove">&times;</button>
  </div>
);

const blank = {
  exp: (): Exp => ({ company: "", title: "", location: "", start: "", end: "", bullets: [] }),
  proj: (): Proj => ({ name: "", bullets: [] }),
  edu: (): Edu => ({ school: "", degree: "", dates: "", details: [] }),
};

/** Minimal, controlled resume editor. Remount it (change `key`) to load a different resume. */
export function ResumeForm({ value: r, onChange }: { value: Resume; onChange: (r: Resume) => void }) {
  const [skills, setSkills] = useState(r.skills.join(", "));
  const set = <K extends keyof Resume>(k: K, v: Resume[K]) => onChange({ ...r, [k]: v });
  type ListKey = "experience" | "projects" | "education";
  const patch = <K extends ListKey>(k: K, i: number, change: Partial<Resume[K][number]>) =>
    onChange({ ...r, [k]: (r[k] as object[]).map((x, j) => (j === i ? { ...x, ...change } : x)) } as Resume);
  const drop = (k: ListKey, i: number) => onChange({ ...r, [k]: (r[k] as object[]).filter((_, j) => j !== i) } as Resume);

  return (
    <div className="space-y-12 text-[15px]">
      <div className="space-y-0.5">
        <input className={`${field} text-[30px] font-semibold tracking-tight`} placeholder="Name" value={r.name} onChange={(e) => set("name", e.target.value)} />
        <input className={field} placeholder="Headline" value={r.headline} onChange={(e) => set("headline", e.target.value)} />
        <Lines value={r.contact} onChange={(v) => set("contact", v)} placeholder="Email, phone, links (one per line)" className="text-gray-500" />
      </div>

      <Section title="Summary">
        <Area value={r.summary} onChange={(v) => set("summary", v)} placeholder="Two short sentences" />
      </Section>

      <Section title="Skills">
        <input className={field} placeholder="Comma separated" value={skills}
          onChange={(e) => { setSkills(e.target.value); set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean)); }} />
      </Section>

      <Section title="Experience" onAdd={() => set("experience", [...r.experience, blank.exp()])}>
        {r.experience.map((e, i) => (
          <Entry key={i} onRemove={() => drop("experience", i)}>
            <div className="grid grid-cols-2 gap-x-4">
              <input className={`${field} font-medium`} placeholder="Title" value={e.title} onChange={(x) => patch("experience", i, { title: x.target.value })} />
              <input className={field} placeholder="Company" value={e.company} onChange={(x) => patch("experience", i, { company: x.target.value })} />
            </div>
            <div className="grid grid-cols-[1fr_1fr_2fr] gap-x-4 text-gray-500">
              <input className={field} placeholder="Start" value={e.start} onChange={(x) => patch("experience", i, { start: x.target.value })} />
              <input className={field} placeholder="End" value={e.end} onChange={(x) => patch("experience", i, { end: x.target.value })} />
              <input className={field} placeholder="Location" value={e.location} onChange={(x) => patch("experience", i, { location: x.target.value })} />
            </div>
            <Lines value={e.bullets} onChange={(v) => patch("experience", i, { bullets: v })} placeholder="What you did, one per line" />
          </Entry>
        ))}
      </Section>

      <Section title="Projects" onAdd={() => set("projects", [...r.projects, blank.proj()])}>
        {r.projects.map((p, i) => (
          <Entry key={i} onRemove={() => drop("projects", i)}>
            <input className={`${field} font-medium`} placeholder="Name" value={p.name} onChange={(x) => patch("projects", i, { name: x.target.value })} />
            <Lines value={p.bullets} onChange={(v) => patch("projects", i, { bullets: v })} placeholder="One per line" />
          </Entry>
        ))}
      </Section>

      <Section title="Education" onAdd={() => set("education", [...r.education, blank.edu()])}>
        {r.education.map((e, i) => (
          <Entry key={i} onRemove={() => drop("education", i)}>
            <div className="grid grid-cols-2 gap-x-4">
              <input className={`${field} font-medium`} placeholder="Degree" value={e.degree} onChange={(x) => patch("education", i, { degree: x.target.value })} />
              <input className={field} placeholder="School" value={e.school} onChange={(x) => patch("education", i, { school: x.target.value })} />
            </div>
            <input className={`${field} text-gray-500`} placeholder="Dates" value={e.dates} onChange={(x) => patch("education", i, { dates: x.target.value })} />
            <Lines value={e.details} onChange={(v) => patch("education", i, { details: v })} placeholder="Details, one per line" />
          </Entry>
        ))}
      </Section>

      <Section title="Certifications">
        <Lines value={r.certifications} onChange={(v) => set("certifications", v)} placeholder="One per line" />
      </Section>
    </div>
  );
}
