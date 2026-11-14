import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-16 md:pt-24">
      <h1 className="text-4xl font-semibold md:text-5xl" style={{ letterSpacing: "-0.04em" }}>{title}</h1>
      <p className="mt-3 text-sm text-neutral-500">Last updated {updated}</p>
      <div className="mt-10 space-y-4 text-[16px] leading-relaxed text-neutral-700 [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-black [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
