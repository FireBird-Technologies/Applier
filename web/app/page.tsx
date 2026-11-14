import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { FaqList } from "@/components/FaqList";
import { PanelMock } from "@/components/PanelMock";
import { faq } from "@/lib/faq";
import { money, pricing, site } from "@/lib/site";
import { formatDate, posts } from "@/lib/posts";

const steps = [
  { n: "01", title: "Sign in with Google", text: "One click in the side panel. No passwords to make or remember." },
  { n: "02", title: "Add your source resume", text: "Upload a PDF, DOCX, Markdown or text file, or paste it. This is the only place facts come from." },
  { n: "03", title: "Open a job posting", text: "Applier checks whether the page is a job and reads the description. Wrong guess? Override it, or stop the scan." },
  { n: "04", title: "Generate, adjust, download", text: "Preview the tailored resume, ask for changes or edit by hand, then download. Downloading is what counts as applied." },
];

const features = [
  { title: "Always one page", text: "PDF and DOCX fit on a single page. Type shrinks to a readable minimum first, then the least important items go, and you are told which." },
  { title: "Only your facts", text: "The writer may reword and reorder, never invent employers, dates, degrees, numbers or skills." },
  { title: "Job page detection", text: "Reads the tab you are on and works out the role and company. Manual override and stop-scan are always one click away." },
  { title: "Edit your way", text: "Ask for a change in plain words, or open the enlarged editor and change any field by hand." },
  { title: "Four formats", text: "Download as PDF, DOCX, Markdown or plain text." },
  { title: "Pay per application", text: `${pricing.freeCredits} free, then ${money(pricing.perApplication)} each. No subscription, and drafts are free.` },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-5xl items-center gap-14 px-6 pb-8 pt-16 md:grid-cols-[1.15fr_1fr] md:pt-24">
        <div className="space-y-6">
          <div className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600">A Chrome extension for job applications</div>
          <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl" style={{ letterSpacing: "-0.04em" }}>
            Apply to jobs with a resume that fits.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-neutral-600">
            Open a job posting. Applier reads it and writes a one-page resume tailored to that role, using only the facts in your own resume.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={site.installUrl} external={site.installIsExternal} className="px-5 py-3">Add to Chrome</ButtonLink>
            <ButtonLink href="/#how-it-works" variant="ghost" className="px-5 py-3">See how it works</ButtonLink>
          </div>
          <p className="text-sm text-neutral-500">{pricing.freeCredits} free applications. No card needed to start.</p>
        </div>
        <PanelMock />
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 pt-28">
        <h2 className="text-3xl font-semibold md:text-4xl" style={{ letterSpacing: "-0.03em" }}>How it works</h2>
        <p className="mt-3 max-w-xl text-neutral-600">Four steps, all inside the Chrome side panel.</p>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="space-y-2 bg-white p-6">
              <div className="font-mono text-xs text-neutral-400">{s.n}</div>
              <h3 className="text-lg font-medium" style={{ letterSpacing: "-0.02em" }}>{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-neutral-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 pt-28">
        <h2 className="text-3xl font-semibold md:text-4xl" style={{ letterSpacing: "-0.03em" }}>Built to stay honest and tidy</h2>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="space-y-2 border-t border-black pt-4">
              <h3 className="font-medium" style={{ letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p className="text-[15px] leading-relaxed text-neutral-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-28">
        <div className="grid gap-8 rounded-lg border border-black p-8 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold" style={{ letterSpacing: "-0.03em" }}>Simple pricing</h2>
            <p className="text-neutral-600">
              {pricing.freeCredits} free applications. After that, {money(pricing.perApplication)} per application with a {money(pricing.minimumCharge)} minimum
              purchase ({pricing.minimumCredits} credits). A credit is used only when you download, so drafts and edits cost nothing.
            </p>
            <Link href="/pricing" className="inline-block text-sm font-medium underline">See pricing details</Link>
          </div>
          <dl className="space-y-3 self-center text-sm">
            {[["First applications", `${pricing.freeCredits} free`], ["Per application", money(pricing.perApplication)], ["Minimum purchase", money(pricing.minimumCharge)], ["Subscription", "None"]].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-neutral-200 pb-2">
                <dt className="text-neutral-500">{k}</dt><dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-28">
        <h2 className="text-3xl font-semibold md:text-4xl" style={{ letterSpacing: "-0.03em" }}>Your resume, your data</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-600">
          While the side panel is open, Applier reads the text of your current tab to check for a job posting. That text is not saved unless you generate a
          resume for the page. Applier never applies for you and never sends your resume anywhere you did not choose.{" "}
          <Link href="/privacy" className="font-medium text-black underline">Read the privacy page</Link>.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-28">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold md:text-4xl" style={{ letterSpacing: "-0.03em" }}>Questions</h2>
          <Link href="/faq" className="text-sm font-medium underline">All questions</Link>
        </div>
        <div className="mt-8"><FaqList items={faq.slice(0, 5)} /></div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-28">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold md:text-4xl" style={{ letterSpacing: "-0.03em" }}>From the blog</h2>
          <Link href="/blog" className="text-sm font-medium underline">All posts</Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col justify-between gap-6 rounded-lg border border-neutral-200 p-5 transition-colors hover:border-black">
              <div className="space-y-2">
                <h3 className="font-medium leading-snug" style={{ letterSpacing: "-0.01em" }}>{p.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-600">{p.description}</p>
              </div>
              <div className="text-xs text-neutral-500">{formatDate(p.date)} · {p.minutes} min read</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-28">
        <div className="space-y-5 rounded-lg bg-black p-10 text-center text-white md:p-14">
          <h2 className="text-3xl font-semibold md:text-4xl" style={{ letterSpacing: "-0.03em" }}>Your next application, tailored.</h2>
          <p className="mx-auto max-w-md text-neutral-400">Add Applier to Chrome and tailor your first {pricing.freeCredits} resumes free.</p>
          <ButtonLink href={site.installUrl} external={site.installIsExternal} className="border-white bg-white px-5 py-3 text-black hover:bg-neutral-200">
            Add to Chrome
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
