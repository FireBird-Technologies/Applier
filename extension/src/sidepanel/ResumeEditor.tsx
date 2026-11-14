import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Application, Resume } from "../api/types";
import { CloseIcon } from "./Icons";

type Exp = Resume["experience"][number];
type Proj = Resume["projects"][number];
type Edu = Resume["education"][number];

const blank = {
  exp: (): Exp => ({ company: "", title: "", location: "", start: "", end: "", bullets: [] }),
  proj: (): Proj => ({ name: "", bullets: [] }),
  edu: (): Edu => ({ school: "", degree: "", dates: "", details: [] }),
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="label">{label}</label>{children}</div>
);
const Section = ({ title, onAdd, addLabel, children }: { title: string; onAdd?: () => void; addLabel?: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between border-b border-black pb-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider">{title}</h3>
      {onAdd && <button className="text-[12px] text-gray-500 underline" onClick={onAdd}>{addLabel}</button>}
    </div>
    {children}
  </section>
);
const Remove = ({ onClick }: { onClick: () => void }) => (
  <button className="text-[12px] text-gray-500 underline" onClick={onClick}>Remove</button>
);
/** One item per line. The backend drops blank lines, so we can keep them while the user types. */
const Lines = ({ value, onChange, rows = 3, placeholder }: { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) => (
  <textarea className="field resize-y text-[12px] leading-snug" rows={Math.max(rows, value.length + 1)} placeholder={placeholder}
    value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
);

interface Props {
  app: Application;
  onSaved: (a: Application) => void;
  onClose: () => void;
}

/** Full-panel editor: the enlarged resume, with every text field editable by hand. */
export function ResumeEditor({ app, onSaved, onClose }: Props) {
  const initial = useMemo(() => JSON.stringify(app.resume), [app.resume]);
  const [r, setR] = useState<Resume>(() => structuredClone(app.resume));
  const [skills, setSkills] = useState(app.resume.skills.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = (): Resume => ({ ...r, skills: skills.split(",").map((s) => s.trim()).filter(Boolean) });
  const dirty = JSON.stringify(current()) !== initial;

  const set = <K extends keyof Resume>(k: K, v: Resume[K]) => setR((p) => ({ ...p, [k]: v }));
  const patch = <K extends "experience" | "projects" | "education">(k: K, i: number, change: Partial<Resume[K][number]>) =>
    setR((p) => ({ ...p, [k]: (p[k] as object[]).map((x, j) => (j === i ? { ...x, ...change } : x)) }) as Resume);
  const drop = (k: "experience" | "projects" | "education", i: number) =>
    setR((p) => ({ ...p, [k]: (p[k] as object[]).filter((_, j) => j !== i) }) as Resume);

  const close = () => { if (!dirty || window.confirm("Discard your edits?")) onClose(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !dirty && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, onClose]);

  const save = async () => {
    setSaving(true); setError("");
    try { onSaved(await api.saveResume(app.id, current())); } catch (e) { setError((e as Error).message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-label="Edit resume">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <div className="label mb-0">Edit resume</div>
          <div className="truncate font-medium">{[app.job_title, app.company].filter(Boolean).join(" at ") || "Tailored resume"}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="btn-ghost px-2 py-1.5" onClick={close} aria-label="Close editor"><CloseIcon /></button>
          <button className="btn-primary px-3 py-1.5" disabled={!dirty || saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <Section title="Header">
          <Field label="Name"><input className="field" value={r.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Headline"><input className="field" value={r.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
          <Field label="Contact (one per line)"><Lines value={r.contact} onChange={(v) => set("contact", v)} rows={2} placeholder="email, phone, location, links" /></Field>
        </Section>

        <Section title="Summary">
          <textarea className="field resize-y text-[12px] leading-snug" rows={4} value={r.summary} onChange={(e) => set("summary", e.target.value)} />
        </Section>

        <Section title="Skills">
          <input className="field" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Comma separated" />
        </Section>

        <Section title="Experience" addLabel="Add role" onAdd={() => set("experience", [...r.experience, blank.exp()])}>
          {r.experience.map((e, i) => (
            <div key={i} className="card space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Title"><input className="field" value={e.title} onChange={(x) => patch("experience", i, { title: x.target.value })} /></Field>
                <Field label="Company"><input className="field" value={e.company} onChange={(x) => patch("experience", i, { company: x.target.value })} /></Field>
                <Field label="Start"><input className="field" value={e.start} onChange={(x) => patch("experience", i, { start: x.target.value })} /></Field>
                <Field label="End"><input className="field" value={e.end} onChange={(x) => patch("experience", i, { end: x.target.value })} /></Field>
              </div>
              <Field label="Location"><input className="field" value={e.location} onChange={(x) => patch("experience", i, { location: x.target.value })} /></Field>
              <Field label="Bullets (one per line)"><Lines value={e.bullets} onChange={(v) => patch("experience", i, { bullets: v })} rows={4} /></Field>
              <Remove onClick={() => drop("experience", i)} />
            </div>
          ))}
        </Section>

        <Section title="Projects" addLabel="Add project" onAdd={() => set("projects", [...r.projects, blank.proj()])}>
          {r.projects.map((p, i) => (
            <div key={i} className="card space-y-2">
              <Field label="Name"><input className="field" value={p.name} onChange={(x) => patch("projects", i, { name: x.target.value })} /></Field>
              <Field label="Bullets (one per line)"><Lines value={p.bullets} onChange={(v) => patch("projects", i, { bullets: v })} /></Field>
              <Remove onClick={() => drop("projects", i)} />
            </div>
          ))}
        </Section>

        <Section title="Education" addLabel="Add school" onAdd={() => set("education", [...r.education, blank.edu()])}>
          {r.education.map((e, i) => (
            <div key={i} className="card space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Degree"><input className="field" value={e.degree} onChange={(x) => patch("education", i, { degree: x.target.value })} /></Field>
                <Field label="School"><input className="field" value={e.school} onChange={(x) => patch("education", i, { school: x.target.value })} /></Field>
              </div>
              <Field label="Dates"><input className="field" value={e.dates} onChange={(x) => patch("education", i, { dates: x.target.value })} /></Field>
              <Field label="Details (one per line)"><Lines value={e.details} onChange={(v) => patch("education", i, { details: v })} rows={2} /></Field>
              <Remove onClick={() => drop("education", i)} />
            </div>
          ))}
        </Section>

        <Section title="Certifications">
          <Lines value={r.certifications} onChange={(v) => set("certifications", v)} rows={2} placeholder="One per line" />
        </Section>

        <p className="text-[12px] text-gray-500">Resumes are kept to one page. If your edits make it too long, the least important items are removed and you will be told which.</p>
        {error && <p className="border-l-2 border-black pl-2">{error}</p>}
      </div>
    </div>
  );
}
