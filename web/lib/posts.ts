import type { Pricing } from "./pricing";
import { money } from "./site";

export type Block = { type: "h2"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  minutes: number;
  body: Block[];
}

export const getPosts = (pricing: Pricing): Post[] => [
  {
    slug: "how-applier-tailors-your-resume",
    title: "How Applier tailors your resume without making things up",
    description: "What Applier changes, what it refuses to change, and why you stay in charge of the final document.",
    date: "2026-11-14",
    minutes: 3,
    body: [
      { type: "p", text: "A tailored resume is only useful if every line of it is true. Applier is built around one rule: the source resume you give it is the only source of facts." },
      { type: "h2", text: "What it does" },
      { type: "ul", items: [
        "Reads the job description and picks out what the employer is asking for.",
        "Moves your most relevant experience to the top and cuts what does not help for this role.",
        "Rewords bullet points to use the job's vocabulary, where that is honest.",
        "Writes a short summary and orders your skills for the role.",
      ] },
      { type: "h2", text: "What it is told never to do" },
      { type: "ul", items: [
        "Invent employers, job titles, dates, degrees or certifications.",
        "Add numbers or results that are not in your source resume.",
        "Claim skills or tools you have not listed.",
      ] },
      { type: "h2", text: "You review everything" },
      { type: "p", text: "AI models can still get things wrong, which is why a draft is never counted as an application until you download it. Before that you can preview the result, ask for changes in plain language, or open the editor and change any field by hand." },
      { type: "p", text: "If something is missing from a draft, add it to your source resume or type it in yourself. Applier will not guess." },
    ],
  },
  {
    slug: "why-one-page-resumes",
    title: "Why Applier keeps every resume to one page",
    description: "How the one-page fit works: smaller type first, then trimming the least important content, and telling you what changed.",
    date: "2026-11-14",
    minutes: 3,
    body: [
      { type: "p", text: "Applier fits every PDF and DOCX on a single page, every time. A tailored resume is a focused argument for one job, and one page forces that focus." },
      { type: "h2", text: "How the fit works" },
      { type: "ul", items: [
        "First the writer is asked for a one-page budget: a short summary, a handful of bullets for recent roles, fewer for older ones.",
        "If the layout still runs over, type and spacing shrink in small steps, down to a readable minimum of 8pt.",
        "If it still does not fit, the least important content goes first: certifications, then projects, then education details, then the oldest bullet points.",
        "Your most recent roles keep the most detail, and every role keeps its first bullets for as long as possible.",
      ] },
      { type: "h2", text: "Nothing disappears silently" },
      { type: "p", text: "When Applier removes something to stay on one page, it tells you exactly what, for example removed 2 certifications and 3 bullets. The saved version is the one you see in the preview, so what you preview is what you download." },
      { type: "p", text: "Your source resume is never modified. If a trimmed item matters for a particular job, ask for it back in plain words, or add it in the editor and Applier will make room by trimming something else." },
    ],
  },
  {
    slug: "credits-pricing-explained",
    title: "Credits, pricing and what counts as an application",
    description: "Ten free applications, then pay per application. How a credit is used and what stays free.",
    date: "2026-11-14",
    minutes: 2,
    body: [
      { type: "p", text: `Applier has no subscription. You get ${pricing.freeCredits} free applications, and after that you buy credits when you need them.` },
      { type: "h2", text: "What costs a credit" },
      { type: "p", text: "One credit is used the first time you download a tailored resume for a job. That is the moment it counts as applied." },
      { type: "h2", text: "What is free" },
      { type: "ul", items: [
        "Detecting a job page and generating a draft.",
        "Previewing, enlarging and editing the draft, by asking or by hand.",
        "Downloading the same resume again in other formats.",
      ] },
      { type: "h2", text: "Buying credits" },
      { type: "p", text: `Credits cost ${money(pricing.perApplication)} each with a ${money(pricing.minimumCharge)} minimum purchase, which is ${pricing.minimumCredits} credits. For example, 50 credits is ${money(50 * pricing.perApplication)} and 100 credits is ${money(100 * pricing.perApplication)}.` },
      { type: "p", text: "Checkout opens in a new tab on Stripe's secure page, and your credits appear in the extension as soon as the payment goes through. The extension also shows how many you have left, and warns you when you are running low." },
    ],
  },
];

export const getPost = (posts: Post[], slug: string) => posts.find((p) => p.slug === slug);

export const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
