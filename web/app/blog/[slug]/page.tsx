import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { formatDate, getPost, posts } from "@/lib/posts";
import { site } from "@/lib/site";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const post = getPost((await params).slug);
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
