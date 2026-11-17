import type { Pricing } from "./pricing";
import { money } from "./site";

export type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "video" }; // the 30-second demo (lib/site.ts demoVideo)

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  minutes: number;
  keywords?: string[]; // search terms this post is written for (from DataForSEO research)
  body: Block[];
}

export const getPosts = (pricing: Pricing): Post[] => [
  {
    slug: "how-to-tailor-your-resume-to-a-job-description",
    title: "How to tailor your resume to a job description (with AI, in 30 seconds)",
    description: "A step-by-step guide to tailoring a resume for a specific job, by hand or with AI, without inventing anything. Includes a 30-second video.",
    date: "2026-11-18",
    minutes: 5,
    keywords: ["tailor resume", "tailor a resume", "tailor resume to job description", "how to tailor resume to job description", "tailor resume to job description ai", "how to tailor your resume"],
    body: [
      { type: "p", text: "To tailor a resume means rewriting it for one specific job: putting the experience that employer asks for at the top, using the words from their job description, and cutting what does not help. It is the single most useful thing you can do to a resume before you send it, and also the most tedious." },
      { type: "p", text: "This guide shows how to tailor your resume to a job description by hand, and then how to do the same thing with AI in about 30 seconds." },
      { type: "video" },
      { type: "h2", text: "How to tailor your resume by hand" },
      { type: "ol", items: [
        "Read the job description twice. Highlight the skills, tools and responsibilities that appear more than once, or near the top. Those are what the employer cares about most.",
        "Match each highlight to something true in your experience. If you have done it, note where. If you have not, leave it out.",
        "Reorder. Move the most relevant role, project or bullet point higher, so a recruiter skimming the page sees it first.",
        "Reword, honestly. If the job says \"REST APIs\" and your resume says \"web services\", use their words for the same work.",
        "Rewrite the summary for this role in two or three lines, and put the most relevant skills first.",
        "Cut. Remove bullets that do not support this application until it fits on one page.",
      ] },
      { type: "p", text: "Done well, this takes 20 to 40 minutes per application. That is fine for a dream job, and painful for the twentieth application of the week." },
      { type: "h2", text: "How to tailor your resume to a job description with AI" },
      { type: "p", text: "You can paste your resume and a job description into a chat AI and ask it to tailor one to the other. It works, but you have to copy everything in by hand, fix the formatting afterwards, and check carefully that it has not invented skills, numbers or job titles. Chat models are good at sounding right, and that is the problem." },
      { type: "p", text: "Applier is built for exactly this job instead:" },
      { type: "ol", items: [
        "Sign in with Google and upload your resume once. It becomes the only source of facts.",
        "Open any job post. Applier detects that it is a job and pulls out the role, company and description automatically.",
        "Click Generate. In seconds you get a one-page resume tailored to that job description.",
        "Edit it with AI (\"make the summary shorter\") or click into the document and type, like in Word. Edits are free and unlimited.",
        "Download it as PDF, DOCX, Markdown or plain text.",
      ] },
      { type: "p", text: "Applier also remembers the edits you make, so each resume after that starts closer to how you like it." },
      { type: "h2", text: "What a tailored resume should never do" },
      { type: "ul", items: [
        "Invent experience. If a requirement is not in your history, it should not appear on the page.",
        "Add numbers you cannot back up in an interview.",
        "Copy the job description word for word. Recruiters notice.",
      ] },
      { type: "p", text: "Applier is told never to do any of these. If something the employer asks for is missing from your resume, it is left out, not made up." },
      { type: "h2", text: "Try it free" },
      { type: "p", text: `You get ${pricing.freeCredits} tailored resumes free, with no card needed. After that it is ${money(pricing.perApplication)} per application, with no subscription.` },
    ],
  },
  {
    slug: "should-you-tailor-your-resume-for-each-job",
    title: "Should you tailor your resume for each job?",
    description: "Yes, for almost every application. Why it matters, how much to change for a specific job, and how to do it without spending an evening per application.",
    date: "2026-11-18",
    minutes: 4,
    keywords: ["should i tailor my resume for each job", "should you tailor your resume to the job", "how to tailor a resume to a specific job", "tailor my resume"],
    body: [
      { type: "p", text: "Short answer: yes. If a job is worth applying to, it is worth sending a resume that was written for it. The longer answer is about how much to change, and how to make it fast enough that you actually do it." },
      { type: "h2", text: "Why tailoring works" },
      { type: "ul", items: [
        "Recruiters skim. They look for the few things the job needs, near the top of the page. A tailored resume puts those things there.",
        "Many employers use applicant tracking systems that search resumes for the skills in the job description. Using the employer's own words for skills you really have helps you get found.",
        "It makes your case for you. A generic resume asks the reader to work out why you fit. A tailored one tells them.",
      ] },
      { type: "h2", text: "How much should you change for a specific job?" },
      { type: "p", text: "Less than you might think. You are not writing a new resume, you are re-aiming the one you have:" },
      { type: "ul", items: [
        "The summary: rewrite it for the role every time.",
        "Skills: reorder so the ones in the job description come first.",
        "Experience: keep your roles and dates, but move the most relevant bullet points up and trim the rest.",
        "Wording: use the job's vocabulary where it describes the same work you did.",
      ] },
      { type: "p", text: "What you should never change are the facts: employers, titles, dates, degrees and results." },
      { type: "h2", text: "When a generic resume is fine" },
      { type: "p", text: "Career fairs, networking, or a recruiter who asked for \"your resume\" without a specific role in mind. Everywhere else, tailor it." },
      { type: "h2", text: "Making it fast" },
      { type: "p", text: "The real reason people skip tailoring is time. Applier removes that: open the job post, click Generate, and you get a one-page resume tailored to that job in seconds, built only from the facts in your own resume. You can then edit it with AI or by hand, for free." },
      { type: "video" },
      { type: "p", text: `It costs ${money(pricing.perApplication)} per application after ${pricing.freeCredits} free ones, so tailoring every resume costs less than a coffee a week.` },
    ],
  },
  {
    slug: "ai-resume-tailor-no-subscription",
    title: "An AI resume tailor with no subscription",
    description: `Most AI resume tools charge monthly and cap how much you can use them. Applier is pay per application: ${money(pricing.perApplication)} per tailored resume, with ${pricing.freeCredits} free to start.`,
    date: "2026-11-18",
    minutes: 3,
    keywords: ["ai resume tailor", "resume tailoring ai", "resume tailor ai", "resume builder no subscription", "free ai resume builder no subscription", "jobscan alternative"],
    body: [
      { type: "p", text: "Job hunting comes in bursts. You might send thirty applications in two weeks, then none for a month. Monthly subscriptions do not fit that: you pay for the quiet months, and in the busy ones you hit a usage limit." },
      { type: "h2", text: "Pay per application instead" },
      { type: "p", text: `Applier has no subscription. You get ${pricing.freeCredits} tailored resumes free, then pay ${money(pricing.perApplication)} for each one you generate, with a ${money(pricing.minimumCharge)} minimum purchase. There is nothing to cancel.` },
      { type: "ul", items: [
        "One credit = one tailored resume for one job.",
        "Editing it, by asking the AI or by hand, is free and unlimited.",
        "Undo and downloads (PDF, DOCX, Markdown, text) are free.",
        "If generation fails, you are not charged.",
      ] },
      { type: "h2", text: "How that compares" },
      { type: "p", text: "Other AI resume tailoring tools usually work out at $0.30 to $1.00 per application once you divide the subscription by what you really use, and many cap how many resumes you can tailor each month. At $0.10 per application, Applier is the lowest cost per application we know of." },
      { type: "h2", text: "What you get for ten cents" },
      { type: "ul", items: [
        "Automatic job detection on any job site: role, company and description are read for you.",
        "A one-page resume tailored to that job description, in seconds.",
        "Only facts from your own resume. Nothing invented.",
        "An editor that works like Word, plus plain-language AI edits.",
        "It remembers your edits, so your next resume starts closer to your style.",
      ] },
      { type: "video" },
      { type: "p", text: "Add it to Chrome, tailor your first resumes free, and only pay again when you are actually applying." },
    ],
  },
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
      { type: "p", text: "AI models can still get things wrong, which is why edits are unlimited. Once a resume is generated you can preview it, ask for changes in plain language, undo any change, or open the editor and change any field by hand, all without using another credit." },
      { type: "p", text: "If something is missing from a draft, add it to your source resume or type it in yourself. Applier will not guess." },
    ],
  },
  {
    slug: "why-one-page-resumes",
    title: "How to make your resume one page (and why Applier always does)",
    description: "How to fit a one page resume without losing what matters: smaller type first, then trimming the least important content, and being told what changed.",
    keywords: ["one page resume", "how to make resume one page"],
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
      { type: "p", text: "One credit is used each time you generate a tailored resume for a job. If the AI request fails, nothing is charged." },
      { type: "h2", text: "What is free" },
      { type: "ul", items: [
        "Detecting a job page.",
        "Every edit to a resume you generated, by asking or by hand, and undoing edits.",
        "Previewing it and downloading it in any format, as often as you like.",
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
