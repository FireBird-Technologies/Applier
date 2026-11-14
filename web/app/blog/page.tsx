import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, posts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "How Applier works, written plainly: tailoring, one-page resumes, credits and pricing.",
};

export default function BlogIndex() {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 md:pt-24">
      <h1 className="text-4xl font-semibold md:text-5xl" style={{ letterSpacing: "-0.04em" }}>Blog</h1>
      <p className="mt-4 text-neutral-600">How Applier works, written plainly.</p>
      <div className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
        {sorted.map((p) => (
          <article key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="group block space-y-2 py-7">
              <div className="text-xs text-neutral-500">{formatDate(p.date)} · {p.minutes} min read</div>
              <h2 className="text-xl font-medium group-hover:underline" style={{ letterSpacing: "-0.02em" }}>{p.title}</h2>
              <p className="text-[15px] leading-relaxed text-neutral-600">{p.description}</p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
