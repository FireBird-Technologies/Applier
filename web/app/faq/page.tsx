import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { faq } from "@/lib/faq";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about installing Applier, how job detection works, pricing, privacy and more.",
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 md:pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-4xl font-semibold md:text-5xl" style={{ letterSpacing: "-0.04em" }}>Frequently asked questions</h1>
      <p className="mt-4 text-neutral-600">
        Can&apos;t find your answer? {site.supportEmail ? <>Email <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>, or </> : null}
        read the <Link href="/blog" className="underline">blog</Link> for longer explanations.
      </p>
      <div className="mt-10"><FaqList items={faq} /></div>
    </div>
  );
}
