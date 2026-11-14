import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** Small monospace label, like "01 / HOW IT WORKS". */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">{children}</div>;
}

/** A page section: hairline divider, eyebrow, big heading, optional intro. Content fades in on scroll. */
export function Section({ id, eyebrow, title, intro, children, center = false }: {
  id?: string; eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; center?: boolean;
}) {
  return (
    <section id={id} className="border-b border-neutral-200">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.08] md:text-5xl" style={{ letterSpacing: "-0.04em" }}>{title}</h2>
          {intro && <p className="mt-5 text-lg leading-relaxed text-neutral-600">{intro}</p>}
        </Reveal>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
