import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { YouTube } from "@/components/YouTube";
import { formatDate, getPost, getPosts } from "@/lib/posts";
import { getPricing } from "@/lib/pricing";
import { site } from "@/lib/site";

type Params = { slug: string };

export const dynamicParams = false;
export const revalidate = 300;

export async function generateStaticParams(): Promise<Params[]> {
  return getPosts(await getPricing()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const post = getPost(getPosts(await getPricing()), (await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const posts = getPosts(await getPricing());
  const post = getPost(posts, (await params).slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 pt-16 md:pt-24">
      <Link href="/blog" className="text-sm text-neutral-500 hover:text-black">&larr; All posts</Link>
      <div className="mt-6 text-xs text-neutral-500">{formatDate(post.date)} · {post.minutes} min read</div>
      <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl" style={{ letterSpacing: "-0.04em" }}>{post.title}</h1>
      <div className="mt-10 space-y-5 text-[17px] leading-relaxed text-neutral-700">
        {post.body.map((b, i) =>
          b.type === "h2" ? (
            <h2 key={i} className="pt-4 text-2xl font-semibold text-black" style={{ letterSpacing: "-0.03em" }}>{b.text}</h2>
          ) : b.type === "ul" ? (
            <ul key={i} className="list-disc space-y-2 pl-6">{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
          ) : b.type === "ol" ? (
            <ol key={i} className="list-decimal space-y-2 pl-6">{b.items.map((it) => <li key={it}>{it}</li>)}</ol>
          ) : b.type === "video" ? (
            <YouTube key={i} className="py-4" />
          ) : b.type === "table" ? (
            <figure key={i} className="py-2">
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
                  <thead className="bg-neutral-50 text-black">
                    <tr>{b.head.map((h) => <th key={h} className="border-b border-neutral-200 px-4 py-3 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className="border-b border-neutral-100 last:border-0">
                        {row.map((cell, c) => <td key={c} className={`px-4 py-3 align-top ${c === 0 ? "font-medium text-black" : ""}`}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {b.caption && <figcaption className="mt-2 text-sm text-neutral-500">{b.caption}</figcaption>}
            </figure>
          ) : b.type === "prompt" ? (
            <div key={i} className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[15px] font-semibold text-black">{b.title}</div>
              <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-[13.5px] leading-relaxed text-neutral-800">{b.text}</pre>
            </div>
          ) : b.type === "related" ? (
            <nav key={i} aria-label="Read next" className="!mt-12 border-t border-neutral-200 pt-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">Read next</div>
              <ul className="mt-4 space-y-3">
                {b.slugs.map((slug) => getPost(posts, slug)).filter((p) => p !== undefined).map((p) => (
                  <li key={p.slug}><Link href={`/blog/${p.slug}`} className="font-medium text-black underline underline-offset-4 hover:text-neutral-600">{p.title}</Link></li>
                ))}
              </ul>
            </nav>
          ) : (
            <p key={i}>{b.text}</p>
          ),
        )}
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-black p-6">
        <div>
          <div className="font-medium">Try Applier on your next application</div>
          <div className="text-sm text-neutral-600">10 free applications, no card needed.</div>
        </div>
        <ButtonLink href={site.installUrl} external={site.installIsExternal}>Add to Chrome</ButtonLink>
      </div>
    </article>
  );
}
