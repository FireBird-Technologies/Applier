import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { FaqList } from "@/components/FaqList";
import { HeroDemo } from "@/components/HeroDemo";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, Section } from "@/components/Section";
import { getFaq } from "@/lib/faq";
import { formatDate, getPosts } from "@/lib/posts";
import { getPricing } from "@/lib/pricing";
import { money, site } from "@/lib/site";

export const revalidate = 300; // prices come from the API; refresh them

const trust = [
  ["Only your facts", "Nothing invented, ever."],
  ["Always one page", "Fitted before you download."],
  ["You stay in control", "Edit anything. Undo anything."],
  ["Never applies for you", "You send it yourself."],
];

const steps = [
  { n: "01", title: "Sign in", text: "One click with Google. No password to make or remember." },
  { n: "02", title: "Add your resume", text: "Upload it once. It is the only place facts come from." },
  { n: "03", title: "Open a job posting", text: "Applier spots that it is a job and reads what the employer asks for." },
  { n: "04", title: "Tailor and download", text: "Review it, change what you like, then download PDF, DOCX, Markdown or text." },
];

const wontDo = [
  ["Invent jobs, dates, degrees or numbers.", "If a requirement is not in your resume, Applier leaves it out and tells you."],
  ["Apply for you.", "It prepares the resume. You send it, on the employer's own site."],
  ["Promise interviews.", "No tool can. A clear, tailored resume just helps you make your case."],
  ["Charge you when it fails.", "A credit is spent only when a resume is delivered. Edits and downloads are free."],
];

const audiences = [
  ["Many applications", "Applying to lots of roles?", "Tailor each one in a click instead of editing a document every time."],
  ["Changing direction", "Moving to a new kind of role?", "See how your existing experience maps onto it, without stretching the truth."],
  ["One source of truth", "Tired of rewriting the same resume?", "Keep a single resume. Applier does the rewriting for each job."],
];

const Chip = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
  <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${dark ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"}`}>{children}</span>
);

function Card({ label, title, text, children, className = "" }: { label: string; title: string; text: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col justify-between gap-10 rounded-2xl border border-neutral-200 bg-white p-7 md:p-8 ${className}`}>
      <div>
        <Eyebrow>{label}</Eyebrow>
        <h3 className="mt-3 text-[22px] font-semibold leading-snug" style={{ letterSpacing: "-0.025em" }}>{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{text}</p>
      </div>
      <div aria-hidden>{children}</div>
    </div>
  );
}

const Bar = ({ w }: { w: string }) => <div className="h-1.5 rounded-full bg-neutral-200" style={{ width: w }} />;

export default async function Home() {
  const pricing = await getPricing();
  const faq = getFaq(pricing);
  const posts = getPosts(pricing);
  const credits = pricing.minimumCredits;

  return (
    <>
      {/* Hero: centered, with the product working right underneath */}
      <section className="relative overflow-hidden border-b border-neutral-200">
        <div className="dots absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pt-28">
          <Reveal>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              {pricing.freeCredits} free resumes. No card needed.
            </div>
            <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl" style={{ letterSpacing: "-0.045em" }}>
              Apply to jobs
              <br />
              <span className="text-neutral-400">with a resume that fits.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-neutral-600 md:text-xl">
              Open a job posting. Applier reads it and writes a one-page resume for that exact role, using only the facts in your own resume.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={site.installUrl} external={site.installIsExternal} className="px-6 py-3.5 text-[15px]">Add to Chrome</ButtonLink>
              <ButtonLink href="/#how-it-works" variant="ghost" className="px-6 py-3.5 text-[15px]">See how it works</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-neutral-500">Works on any job site.</p>
          </Reveal>
          <Reveal delay={150} className="mt-16"><HeroDemo /></Reveal>
        </div>
      </section>

      {/* Trust strip: facts about the product, not borrowed logos */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4 md:divide-x md:divide-neutral-200">
          {trust.map(([title, text]) => (
            <div key={title} className="p-6 text-center md:p-8">
              <div className="text-[15px] font-semibold">{title}</div>
              <div className="mt-1 text-sm text-neutral-500">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <Section id="how-it-works" eyebrow="01 / How it works" title="From job posting to tailored resume in four steps."
        intro="Everything happens in a side panel next to the page you are reading.">
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="border-t border-black pt-5">
                <div className="font-mono text-6xl font-semibold text-neutral-200" style={{ letterSpacing: "-0.05em" }}>{s.n}</div>
                <h3 className="mt-6 text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="features" eyebrow="02 / What you get" title="Built to stay honest and tidy.">
        <div className="grid gap-4 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <Card className="h-full" label="One page" title="Always fits on a single page." text="Type shrinks to a readable minimum first. If something still has to go, the least important items are removed first and you are told which.">
              <div className="flex items-end gap-4">
                <div className="w-28 space-y-2 rounded-md border border-neutral-300 p-3"><Bar w="60%" /><Bar w="100%" /><Bar w="85%" /><Bar w="92%" /><Bar w="70%" /></div>
                <span className="font-mono text-sm text-neutral-500">1 / 1</span>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={80}>
            <Card className="h-full" label="Honest" title="Only your facts." text="Reworded and reordered for the role. Never invented.">
              <div className="flex flex-wrap gap-2"><Chip dark>&#10003; Python</Chip><Chip dark>&#10003; Team of 4</Chip><span className="rounded-full border border-dashed border-neutral-400 px-3 py-1 text-[12px] text-neutral-500">invented: none</span></div>
            </Card>
          </Reveal>
          <Reveal>
            <Card className="h-full" label="Detection" title="Knows a job when it sees one." text="Reads the page you are on. Wrong guess? Correct it in a click.">
              <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 font-mono text-[11px] text-neutral-500"><span className="h-1.5 w-1.5 rounded-full bg-black" />careers.acme.com/jobs/482<span className="ml-auto rounded bg-black px-1.5 py-0.5 text-white">job</span></div>
            </Card>
          </Reveal>
          <Reveal className="md:col-span-2" delay={80}>
            <Card className="h-full" label="Control" title="Edit it your way." text="Ask for a change in plain words, edit any line by hand, remove or rearrange whole sections, and undo anything. Edits are unlimited.">
              <div className="grid gap-2 sm:grid-cols-3">
                {["Summary", "Experience", "Skills"].map((s) => (
                  <div key={s} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-[13px]"><span>{s}</span><span className="font-mono text-neutral-400">&uarr; &darr;</span></div>
                ))}
              </div>
            </Card>
          </Reveal>
          <Reveal>
            <Card className="h-full" label="Formats" title="Download anywhere." text="Take it in the format each application asks for.">
              <div className="flex flex-wrap gap-2">{["PDF", "DOCX", "MD", "TXT"].map((f) => <Chip key={f}>{f}</Chip>)}</div>
            </Card>
          </Reveal>
          <Reveal delay={80}>
            <Card className="h-full" label="Pricing" title="Pay per resume." text={`${pricing.freeCredits} free to start. No subscription.`}>
              <div className="font-mono text-4xl font-semibold" style={{ letterSpacing: "-0.04em" }}>{money(pricing.perApplication)}<span className="ml-2 font-sans text-sm font-normal text-neutral-500">per resume</span></div>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section eyebrow="03 / Honest by design" title="What Applier will not do."
        intro="A resume tool is only worth using if you can trust it. So here are the limits, up front.">
        <Reveal>
          <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
            {wontDo.map(([title, text]) => (
              <li key={title} className="grid gap-2 p-6 md:grid-cols-[2rem_1fr_1.3fr] md:items-baseline md:gap-6 md:p-8">
                <span className="font-mono text-xl text-neutral-400" aria-hidden>&times;</span>
                <span className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{title}</span>
                <span className="text-[15px] leading-relaxed text-neutral-600">{text}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section eyebrow="04 / Who it is for" title="Made for the way people really job hunt.">
        <div className="grid gap-4 md:grid-cols-3">
          {audiences.map(([label, title, text], i) => (
            <Reveal key={label} delay={i * 80}>
              <div className="h-full rounded-2xl border border-neutral-200 p-7 md:p-8">
                <Eyebrow>{label}</Eyebrow>
                <h3 className="mt-4 text-[22px] font-semibold leading-snug" style={{ letterSpacing: "-0.025em" }}>{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="05 / Pricing" title="Simple, with the maths shown."
        intro={<>A credit is spent when a resume is delivered. Nothing else costs anything. <Link href="/pricing" className="font-medium text-black underline underline-offset-4">See pricing details</Link></>}>
        <Reveal>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [`${pricing.freeCredits}`, "free resumes to start", "No card needed."],
              [money(pricing.perApplication), "per tailored resume", "After the free ones."],
              [money(pricing.minimumCharge), "minimum purchase", `That buys ${credits} resumes.`],
              ["$0", "for edits, undo, downloads", "And for any failed generation."],
            ].map(([big, label, note]) => (
              <div key={label} className="bg-white p-7 md:p-8">
                <dt className="font-mono text-5xl font-semibold" style={{ letterSpacing: "-0.05em" }}>{big}</dt>
                <dd className="mt-3 text-[15px] font-medium">{label}</dd>
                <dd className="mt-1 text-sm text-neutral-500">{note}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Section>

      <Section eyebrow="06 / Questions" title="Before you add it.">
        <Reveal>
          <FaqList items={faq.slice(0, 5)} />
          <Link href="/faq" className="mt-6 inline-block text-sm font-medium underline underline-offset-4">All questions</Link>
        </Reveal>
      </Section>

      <Section eyebrow="07 / Read more" title="From the blog.">
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col justify-between gap-8 rounded-2xl border border-neutral-200 p-7 transition-colors hover:border-black">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold leading-snug" style={{ letterSpacing: "-0.02em" }}>{p.title}</h3>
                  <p className="text-[15px] leading-relaxed text-neutral-600">{p.description}</p>
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">{formatDate(p.date)} &middot; {p.minutes} min</div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <section className="mx-auto max-w-6xl px-6 pt-24">
        <Reveal>
          <div className="rounded-3xl bg-black px-6 py-20 text-center text-white md:py-28">
            <h2 className="mx-auto max-w-2xl text-4xl font-semibold leading-[1.05] md:text-6xl" style={{ letterSpacing: "-0.045em" }}>
              Your next application, tailored.
            </h2>
            <p className="mx-auto mt-6 max-w-md text-lg text-neutral-400">Add Applier to Chrome and tailor your first {pricing.freeCredits} resumes free.</p>
            <div className="mt-10">
              <ButtonLink href={site.installUrl} external={site.installIsExternal} className="bg-white px-7 py-3.5 text-[15px] text-black hover:bg-neutral-200">Add to Chrome</ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
