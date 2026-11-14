import type { FaqItem } from "@/lib/faq";

/** Accordion built on <details>, so it needs no client JavaScript. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-neutral-200 border-y border-neutral-200">
      {items.map((f) => (
        <details key={f.id} id={f.id} className="group py-1">
          <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-left text-[15px] font-medium">
            {f.q}
            <span className="text-xl leading-none text-neutral-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-neutral-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
