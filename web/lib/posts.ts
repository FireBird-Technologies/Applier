import type { Pricing } from "./pricing";
import { money } from "./site";

export type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  | { type: "prompt"; title: string; text: string } // a copyable AI prompt
  | { type: "related"; slugs: string[] } // "Read next" links to other posts
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
    title: "How to tailor your resume to a job description (with a before and after)",
    description: "A step-by-step guide to tailoring your resume for a specific job, with a real before-and-after example, what to change, what never to change, and how to do it in seconds with AI.",
    date: "2026-11-18",
    minutes: 6,
    keywords: ["tailor resume", "tailor a resume", "resume tailor", "tailor my resume", "tailor resume to job description", "how to tailor resume to job description", "how to tailor your resume", "should i tailor my resume for each job"],
    body: [
      { type: "p", text: "To tailor a resume means re-aiming it at one specific job: the experience that employer asks for moves to the top, it is described in their words, and whatever does not help is cut. You are not writing a new resume. You are choosing which true things to lead with." },
      { type: "h2", text: "Should you tailor your resume for each job?" },
      { type: "p", text: "Yes, for any job you actually want. Recruiters skim for the handful of things the role needs, and many employers search applications by skill or job title. A generic resume makes the reader work out why you fit. A tailored one tells them in the first few lines. The only times a general resume is fine are career fairs, networking, or a recruiter who asks for \"your resume\" with no role in mind." },
      { type: "h2", text: "How to tailor your resume, step by step" },
      { type: "ol", items: [
        "Read the job description and mark the hard skills, tools and responsibilities. Anything that appears twice, or in both the duties and the requirements, matters most. (Our guide to resume keywords goes deeper on this.)",
        "Match each one to something true in your resume. If you have done it, note where. If you have not, leave it out.",
        "Reorder. Put the most relevant role, project or bullet first within each section.",
        "Reword honestly. Use the employer's words for work you really did: if they say \"REST APIs\" and you wrote \"web services\", say REST APIs.",
        "Rewrite the summary for this role in two or three lines, and list the skills they ask for first.",
        "Cut until it fits on one page. Remove the bullets that do not support this application, oldest first.",
      ] },
      { type: "h2", text: "A before and after" },
      { type: "p", text: "The job: a Backend Engineer role on a payments team. The posting asks for REST APIs, Python, performance work and leading a small team. Here is the same experience, before and after tailoring. Notice that nothing new is added." },
      { type: "table", head: ["Before (generic)", "After (tailored for this job)"], rows: [
        ["Built and maintained the web services (REST APIs) for our payments product, in Python.", "Built and maintained REST APIs in Python for a payments platform."],
        ["Added caching to the reporting service, which made reports faster (6 min to 40 s).", "Cut report generation time from 6 minutes to 40 seconds by adding caching."],
        ["Team lead for 4 engineers. Ran the weekly planning meetings.", "Led a team of 4 engineers and ran weekly planning."],
        ["Skills: Git, Docker, Python, PostgreSQL, caching.", "Skills: Python, REST APIs, PostgreSQL, caching, Docker, Git."],
      ], caption: "Every fact on the right is already on the left. Only the order and the words changed." },
      { type: "h2", text: "What you should never change" },
      { type: "ul", items: [
        "Employers, job titles, dates, degrees and certifications.",
        "Numbers and results. If you cannot explain a figure in an interview, it should not be there.",
        "Skills you do not have. If the job asks for something you have not done, leave it off rather than stretch it.",
      ] },
      { type: "h2", text: "Tailoring a resume with AI" },
      { type: "p", text: "Doing this by hand takes 20 to 40 minutes per application. A chat AI can speed it up if you give it strict rules, but it will happily add skills from the job description that you never had, so check every line." },
      { type: "p", text: "Applier does the whole loop in the browser instead. Open any job post and it detects the role, company and description on the page, so there is nothing to copy and paste. Click Generate and you get a one-page resume tailored to that job, built only from the facts in your own resume. Anything the employer asks for that your resume does not show is left out, not invented. Then edit it with AI or click into it and type, like in Word." },
      { type: "video" },
      { type: "p", text: `You get ${pricing.freeCredits} tailored resumes free, then it is ${money(pricing.perApplication)} per application, with no subscription.` },
      { type: "related", slugs: ["resume-keywords-from-job-description", "chatgpt-resume-prompts", "why-one-page-resumes"] },
    ],
  },
  {
    slug: "chatgpt-resume-prompts",
    title: "ChatGPT for your resume: 7 prompts that work, and what it makes up",
    description: "How to use ChatGPT to write and tailor your resume: seven copy-and-paste prompts, the mistakes it makes (invented numbers, skills and titles), and a prompt that catches them.",
    date: "2026-11-18",
    minutes: 7,
    keywords: ["chatgpt resume", "chatgpt resume prompts", "chatgpt resume prompt", "chatgpt for resume", "resume prompts for chatgpt", "can chatgpt write a resume", "chatgpt for resume tailoring", "using chatgpt for resume"],
    body: [
      { type: "p", text: "ChatGPT can write and tailor a resume, and it is genuinely good at rewording. The catch is that it writes what sounds right, not what is true. Treat it like a sharp editor who has never met you: give it all the facts, give it strict rules, and check its work." },
      { type: "h2", text: "Can ChatGPT write a resume?" },
      { type: "p", text: "It can draft one, rewrite one, and tailor one to a job description. What it cannot do is know anything about you beyond what you paste in. When a job description asks for something your resume does not mention, it will often fill the gap with something plausible. That is the main risk, and the prompts below are written to block it." },
      { type: "h2", text: "Before you start" },
      { type: "ul", items: [
        "Paste your full resume as plain text, not a summary of it.",
        "Paste the full job description, including the requirements section.",
        "Start a new chat for each job, so details from one application do not leak into the next.",
      ] },
      { type: "h2", text: "7 ChatGPT resume prompts that work" },
      { type: "prompt", title: "1. Tailor your resume to a job description", text: "Here is my resume and a job description. Rewrite my resume for this job.\nRules:\n- Use only facts that appear in my resume.\n- Do not add employers, job titles, dates, degrees, tools, skills or numbers that are not in it.\n- If the job asks for something my resume does not show, do not add it. List it at the end under \"Not in my resume\".\n- Keep it to one page.\n\nRESUME:\n[paste your resume]\n\nJOB DESCRIPTION:\n[paste the job description]" },
      { type: "prompt", title: "2. Find the keywords that matter", text: "List the 10 most important skills, tools and qualifications in this job description, most important first. For each one, say whether my resume shows it (yes, partly or no) and quote the line from my resume that shows it." },
      { type: "prompt", title: "3. Write a summary for this role", text: "Write a 2 to 3 sentence professional summary for this role using only facts from my resume. Do not use words like passionate, results-driven, dynamic or seasoned." },
      { type: "prompt", title: "4. Make bullet points stronger", text: "Rewrite these bullet points so each starts with a strong verb and leads with the result. Keep every number exactly as written. If a bullet has no result, do not invent one. Ask me a question that would help me add a real one." },
      { type: "prompt", title: "5. Cut it to one page", text: "My resume is too long for this job. List what to cut, least relevant first, and say why. Do not rewrite anything yet." },
      { type: "prompt", title: "6. Fact-check the result (always run this)", text: "Compare the tailored resume to my original resume. List every skill, tool, number, job title, date or claim in the tailored version that does not appear in the original." },
      { type: "prompt", title: "7. Prepare for the interview", text: "For each bullet point in this resume, write the question a hiring manager is most likely to ask about it." },
      { type: "h2", text: "What ChatGPT gets wrong on resumes" },
      { type: "ul", items: [
        "Invented numbers. \"Improved performance\" becomes \"improved performance by 40%\" even when you never measured it.",
        "Borrowed skills. Tools from the job description appear in your skills section because they fit the pattern.",
        "Inflated roles. \"Helped with\" becomes \"led\", and titles get quietly upgraded.",
        "Generic language. Without rules it reaches for the same buzzwords every recruiter has seen a thousand times.",
        "Lost formatting. Pasting the result back into Word or Google Docs usually means rebuilding the layout and fitting it to a page by hand.",
        "Forgotten rules. In a long chat, earlier instructions like \"only use my facts\" start to slip.",
      ] },
      { type: "p", text: "Prompt 6 is the safety net. Run it every time, and delete anything it flags that you cannot defend." },
      { type: "h2", text: "Can employers tell you used ChatGPT?" },
      { type: "p", text: "Not reliably, and most do not mind that you used a tool. What they notice is a resume that sounds generic, or a claim that falls apart when they ask about it. Using AI is not the problem. Claims you cannot back up are." },
      { type: "h2", text: "When a dedicated tool is faster" },
      { type: "p", text: "ChatGPT works well for one or two applications. For ten a week, the copy, paste, prompt, check and reformat loop gets slow. Applier runs that loop for you: it detects the job on the page you are reading, tailors your resume using only facts from it, fits it to one page and gives you a formatted PDF or DOCX. You can still ask for changes in plain words, like you would in a chat." },
      { type: "p", text: `It is ${money(pricing.perApplication)} per application after ${pricing.freeCredits} free ones, with no subscription.` },
      { type: "related", slugs: ["how-to-tailor-your-resume-to-a-job-description", "resume-keywords-from-job-description", "best-ai-resume-tailoring-tools"] },
    ],
  },
  {
    slug: "resume-keywords-from-job-description",
    title: "Resume keywords: how to find them in a job description (with an example)",
    description: "Find the resume keywords a job description is really asking for, decide which ones you can honestly claim, and put them where recruiters and applicant tracking systems look.",
    date: "2026-11-18",
    minutes: 5,
    keywords: ["resume keywords", "keywords for resume", "job description keywords", "how to find keywords in a job description", "ats resume keywords", "how to identify keywords in a job description"],
    body: [
      { type: "p", text: "Resume keywords are the skills, tools, qualifications and job titles an employer uses to describe a role. Recruiters search for them, and applicant tracking systems (ATS) let recruiters filter applications by them. The best keywords for your resume are not on a generic list. They are in the job description you are applying to." },
      { type: "h2", text: "How to find keywords in a job description" },
      { type: "ol", items: [
        "Copy the job description into a document and delete the boilerplate: benefits, company history, legal statements.",
        "Highlight hard skills first: tools, software, programming languages, methods and certifications. These are the keywords recruiters filter on.",
        "Note the job title and any variations of it. The title itself is one of the most searched keywords.",
        "Count what repeats. Use Ctrl+F (Cmd+F on a Mac). A skill mentioned in both the duties and the requirements matters more than one mentioned once.",
        "Split the list into must-haves (under \"requirements\") and nice-to-haves (\"preferred\", \"bonus\", \"a plus\").",
        "Keep soft skills only when they are specific. \"Lead a small team\" is a keyword. \"Team player\" usually is not.",
      ] },
      { type: "h2", text: "A worked example" },
      { type: "p", text: "Here is a short posting: \"We are hiring a Backend Engineer to build and scale the REST APIs behind our payments product. You will own performance, write Python every day, and lead a small team. Requirements: 4+ years of backend experience with strong Python, and experience with PostgreSQL and caching. Kafka is a plus.\"" },
      { type: "table", head: ["Keyword", "Type", "Priority", "Where it goes"], rows: [
        ["Backend Engineer", "Job title", "High", "Headline and summary"],
        ["REST APIs", "Hard skill", "Must-have (mentioned in duties)", "Experience bullets and skills"],
        ["Python", "Hard skill", "Must-have (duties and requirements)", "Skills and bullets"],
        ["Performance", "Responsibility", "High", "A bullet with a measured result"],
        ["Lead a small team", "Responsibility", "High", "A bullet and the summary"],
        ["PostgreSQL, caching", "Tools", "Must-have", "Skills and bullets"],
        ["Kafka", "Tool", "Nice-to-have", "Only if you have really used it"],
      ] },
      { type: "h2", text: "Where to put resume keywords" },
      { type: "ul", items: [
        "Summary: the job title plus the two or three skills the role leans on most.",
        "Skills section: the exact spellings from the posting. Include both the short and long form once if the posting uses both, for example \"Search Engine Optimization (SEO)\".",
        "Experience bullets: the strongest place, because each keyword appears next to proof. \"Built REST APIs in Python\" beats \"Python\" in a list.",
        "Not in hidden text, keyword dumps or sentences copied from the posting. Recruiters read the resume too.",
      ] },
      { type: "h2", text: "Only use keywords you can back up" },
      { type: "p", text: "If the posting asks for Kafka and you have never used it, leave it off. An interviewer will ask, and a keyword you cannot talk about costs more than it gains. If you have done something close, describe what you actually did in plain words." },
      { type: "h2", text: "Let Applier do the matching" },
      { type: "p", text: "Applier reads the job post you are on, picks out what the employer is asking for, and matches it against your resume. The tailored version uses the employer's language for the experience you really have. Anything your resume does not support is left out, not added, so every keyword on the page is one you can defend." },
      { type: "related", slugs: ["how-to-tailor-your-resume-to-a-job-description", "chatgpt-resume-prompts", "best-ai-resume-tailoring-tools"] },
    ],
  },
  {
    slug: "best-ai-resume-tailoring-tools",
    title: "Best AI resume tailoring tools in 2026, compared by cost per application",
    description: "Teal, Kickresume, resume tailoring apps, ChatGPT and Applier compared on what matters when you apply a lot: the workflow, whether it invents things, and what each tailored resume really costs.",
    date: "2026-11-18",
    minutes: 6,
    keywords: ["best ai for resume tailoring", "best ai resume tailoring tool", "ai resume tailor", "resume tailoring ai", "jobscan alternative", "teal alternative"],
    body: [
      { type: "p", text: "Disclosure: we make Applier, so read this with that in mind. We have tried to be fair. Prices come from each tool's public pricing page, checked on November 18, 2026. Prices change, so confirm before you buy." },
      { type: "h2", text: "What actually matters" },
      { type: "ul", items: [
        "Cost per tailored resume at the number of applications you really send, not the monthly headline price.",
        "Workflow: do you copy and paste every job description, or does the tool read it for you?",
        "Honesty: does it add skills and numbers you do not have?",
        "Output: one page, clean formatting, and the file types employers ask for.",
        "Editing: can you change the result easily without paying again?",
      ] },
      { type: "h2", text: "The real cost per application" },
      { type: "p", text: "A subscription costs the same whether you send five resumes or a hundred, so the price per resume depends entirely on your volume. Here is what 20 and 100 tailored resumes a month cost on each plan." },
      { type: "table", head: ["Tool and plan", "Price", "20 resumes a month", "100 resumes a month"], rows: [
        ["Teal+ (30 days)", "$0.96 a day, about $28.80 per 30 days", "$28.80 ($1.44 each)", "$28.80 ($0.29 each)"],
        ["Teal+ (weekly)", "$13 a week", "about $56 ($2.80 each)", "about $56 ($0.56 each)"],
        ["Kickresume (monthly)", "€24 a month", "€24 (€1.20 each)", "€24 (€0.24 each)"],
        ["Kickresume (yearly)", "€96 paid upfront for 12 months", "€8 a month (€0.40 each)", "€8 a month (€0.08 each)"],
        ["Applier", `${money(pricing.perApplication)} per resume, no subscription`, `${money(20 * pricing.perApplication)} (${money(pricing.perApplication)} each)`, `${money(100 * pricing.perApplication)} (${money(pricing.perApplication)} each)`],
      ], caption: "Weekly Teal+ assumes about 4.3 weeks a month. Kickresume prices are in euros as listed." },
      { type: "p", text: "The honest summary: if you send fewer than about a hundred tailored resumes a month, or you do not want to commit to a year upfront, paying per application is the cheapest option. If you apply to a hundred or more jobs every month and are happy to pay for a year in advance, a yearly subscription can work out cheaper per resume." },
      { type: "h2", text: "Teal" },
      { type: "p", text: "An all-in-one job search suite: a job tracker, a resume builder and keyword matching against job descriptions. The free plan shows the top 5 keywords for a job and includes a few AI credits; Teal+ unlocks every keyword, a match score and unlimited AI writing." },
      { type: "ul", items: ["Best for: organizing a large search in one place.", "Keep in mind: tailoring happens inside their builder, one job at a time, and the useful parts are behind the subscription."] },
      { type: "h2", text: "Kickresume" },
      { type: "p", text: "Strong on resume design, with 40 premium templates. The AI writer and ATS checker are part of Premium; the free plan covers basic templates and unlimited downloads." },
      { type: "ul", items: ["Best for: a polished, design-led resume.", "Keep in mind: the AI features need a subscription, and the cheapest rate needs a yearly plan."] },
      { type: "h2", text: "Resume tailoring apps" },
      { type: "p", text: "A wave of single-purpose tools, such as Resume Tailor, JobOwl, TailoredCV and CVTailor, follow the same pattern: upload your resume, paste a job description, get a rewritten version, often with a match score. Resume Tailor, for example, is free to start with Pro plans for unlimited tailoring. Pricing varies, so check each one's pricing page." },
      { type: "ul", items: ["Best for: quick tailoring in one place.", "Keep in mind: you copy the job description over by hand for every application."] },
      { type: "h2", text: "ChatGPT and other chat AIs" },
      { type: "p", text: "Flexible and effectively free if you already pay for one. With strict prompts they tailor well, but they invent details when the job asks for something you lack, and you rebuild the formatting yourself. Our ChatGPT resume prompts guide shows how to keep them honest." },
      { type: "ul", items: ["Best for: occasional applications.", "Keep in mind: every claim needs checking, every time."] },
      { type: "h2", text: "Applier" },
      { type: "p", text: "A Chrome extension that works on the job post you are already reading. It detects the role, company and description automatically, writes a one-page resume tailored to that job using only facts from your own resume, and lets you edit it with AI or by hand. Edits and downloads (PDF, DOCX, Markdown, text) are free." },
      { type: "ul", items: [`Best for: applying to several jobs a week without copy-pasting or a subscription. ${pricing.freeCredits} free, then ${money(pricing.perApplication)} each.`, "Keep in mind: it is Chrome only, and it focuses on tailoring the resume rather than managing your whole job search."] },
      { type: "h2", text: "Which should you pick?" },
      { type: "ul", items: [
        "You want a job tracker and a full suite: Teal.",
        "You care most about design: Kickresume.",
        "You apply occasionally and already pay for ChatGPT: use it with the prompts in our guide.",
        "You apply often, want each resume tailored without pasting, and do not want a subscription: Applier.",
      ] },
      { type: "related", slugs: ["chatgpt-resume-prompts", "how-to-tailor-your-resume-to-a-job-description", "credits-pricing-explained"] },
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
