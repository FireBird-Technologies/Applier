import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SECTION_KEYS, type Resume, type SectionKey } from "../api/types";

type Exp = Resume["experience"][number];
type Proj = Resume["projects"][number];
type Edu = Resume["education"][number];
type ListKey = "experience" | "projects" | "education";

const TITLES: Record<SectionKey, string> = {
  summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education", certifications: "Certifications",
};

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

/** Small text control (arrows, remove). Hidden until the row is hovered or focused. */
const Tiny = ({ label, onClick, disabled, children }: { label: string; onClick?: () => void; disabled?: boolean; children: ReactNode }) => (
  <button type="button" aria-label={label} title={label} disabled={disabled || !onClick} onClick={onClick}
    className="px-1.5 text-gray-400 hover:text-black disabled:cursor-default disabled:text-gray-200 disabled:hover:text-gray-200">
    {children}
  </button>
);

interface Controls { index: number; count: number; onUp: () => void; onDown: () => void; onRemove: () => void }

const Section = ({ title, onAdd, ctl, children }: { title: string; onAdd?: () => void; ctl: Controls; children: ReactNode }) => (
  <section className="group/section space-y-2">
    <div className="flex items-baseline justify-between">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">{title}</h3>
      <div className="flex items-baseline gap-1 text-[13px]">
        <span className="flex items-baseline opacity-0 transition-opacity focus-within:opacity-100 group-hover/section:opacity-100">
          <Tiny label={`Move ${title} up`} onClick={ctl.onUp} disabled={ctl.index === 0}>&uarr;</Tiny>
          <Tiny label={`Move ${title} down`} onClick={ctl.onDown} disabled={ctl.index === ctl.count - 1}>&darr;</Tiny>
          <Tiny label={`Remove ${title} section`} onClick={ctl.onRemove}>Remove</Tiny>
        </span>
        {onAdd && <button className="px-1.5 text-gray-400 hover:text-black" onClick={onAdd}>+ add</button>}
      </div>
    </div>
    {children}
  </section>
);

const Entry = ({ onUp, onDown, onRemove, children }: { onUp?: () => void; onDown?: () => void; onRemove: () => void; children: ReactNode }) => (
  <div className="group/entry relative space-y-1 py-4">
    {children}
    <span className="absolute right-0 top-2 flex text-[15px] opacity-0 transition-opacity focus-within:opacity-100 group-hover/entry:opacity-100">
      <Tiny label="Move up" onClick={onUp}>&uarr;</Tiny>
      <Tiny label="Move down" onClick={onDown}>&darr;</Tiny>
      <Tiny label="Remove" onClick={onRemove}>&times;</Tiny>
    </span>
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
  const order = (r.section_order ?? [...SECTION_KEYS]) as SectionKey[];
  const hidden = SECTION_KEYS.filter((k) => !order.includes(k));

  const set = <K extends keyof Resume>(k: K, v: Resume[K]) => onChange({ ...r, [k]: v });
  const patch = <K extends ListKey>(k: K, i: number, change: Partial<Resume[K][number]>) =>
    onChange({ ...r, [k]: (r[k] as object[]).map((x, j) => (j === i ? { ...x, ...change } : x)) } as Resume);
  const drop = (k: ListKey, i: number) => onChange({ ...r, [k]: (r[k] as object[]).filter((_, j) => j !== i) } as Resume);

  // Rearranging: entries inside a section, and the sections themselves.
  const swap = <T,>(arr: T[], i: number, d: number): T[] => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const out = [...arr];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  };
  const moveItem = (k: ListKey, i: number, d: number) => onChange({ ...r, [k]: swap(r[k] as object[], i, d) } as Resume);
  const moveSection = (k: SectionKey, d: number) => set("section_order", swap(order, order.indexOf(k), d));
  const removeSection = (k: SectionKey) => set("section_order", order.filter((x) => x !== k));
  const addSection = (k: SectionKey) => set("section_order", [...order, k]);

  const entryProps = (k: ListKey, i: number) => ({
    onUp: i > 0 ? () => moveItem(k, i, -1) : undefined,
    onDown: i < r[k].length - 1 ? () => moveItem(k, i, 1) : undefined,
    onRemove: () => drop(k, i),
  });

  const content: Record<SectionKey, ReactNode> = {
    summary: <Area value={r.summary} onChange={(v) => set("summary", v)} placeholder="Two short sentences" />,
    skills: (
      <input className={field} placeholder="Comma separated" value={skills}
        onChange={(e) => { setSkills(e.target.value); set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean)); }} />
    ),
    experience: <>{r.experience.map((e, i) => (
      <Entry key={i} {...entryProps("experience", i)}>
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
    ))}</>,
    projects: <>{r.projects.map((p, i) => (
      <Entry key={i} {...entryProps("projects", i)}>
        <input className={`${field} font-medium`} placeholder="Name" value={p.name} onChange={(x) => patch("projects", i, { name: x.target.value })} />
        <Lines value={p.bullets} onChange={(v) => patch("projects", i, { bullets: v })} placeholder="One per line" />
      </Entry>
    ))}</>,
    education: <>{r.education.map((e, i) => (
      <Entry key={i} {...entryProps("education", i)}>
        <div className="grid grid-cols-2 gap-x-4">
          <input className={`${field} font-medium`} placeholder="Degree" value={e.degree} onChange={(x) => patch("education", i, { degree: x.target.value })} />
          <input className={field} placeholder="School" value={e.school} onChange={(x) => patch("education", i, { school: x.target.value })} />
        </div>
        <input className={`${field} text-gray-500`} placeholder="Dates" value={e.dates} onChange={(x) => patch("education", i, { dates: x.target.value })} />
        <Lines value={e.details} onChange={(v) => patch("education", i, { details: v })} placeholder="Details, one per line" />
      </Entry>
    ))}</>,
    certifications: <Lines value={r.certifications} onChange={(v) => set("certifications", v)} placeholder="One per line" />,
  };
  const adders: Partial<Record<SectionKey, () => void>> = {
    experience: () => set("experience", [...r.experience, blank.exp()]),
    projects: () => set("projects", [...r.projects, blank.proj()]),
    education: () => set("education", [...r.education, blank.edu()]),
  };

  return (
    <div className="space-y-12 text-[15px]">
      <div className="space-y-0.5">
        <input className={`${field} text-[30px] font-semibold tracking-tight`} placeholder="Name" value={r.name} onChange={(e) => set("name", e.target.value)} />
        <input className={field} placeholder="Headline" value={r.headline} onChange={(e) => set("headline", e.target.value)} />
        <Lines value={r.contact} onChange={(v) => set("contact", v)} placeholder="Email, phone, links (one per line)" className="text-gray-500" />
      </div>

      {order.map((k, i) => (
        <Section key={k} title={TITLES[k]} onAdd={adders[k]}
          ctl={{ index: i, count: order.length, onUp: () => moveSection(k, -1), onDown: () => moveSection(k, 1), onRemove: () => removeSection(k) }}>
          {content[k]}
        </Section>
      ))}

      {hidden.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-gray-200 pt-6 text-[13px]">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">Removed sections</span>
          {hidden.map((k) => (
            <button key={k} className="text-gray-500 hover:text-black" onClick={() => addSection(k)}>+ {TITLES[k]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
