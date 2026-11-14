import { money, pricing } from "./site";

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export const faq: FaqItem[] = [
  {
    id: "install",
    q: "How do I install Applier?",
    a: "Click Add to Chrome to open the extension's page in the Chrome Web Store, then choose Add to Chrome. Pin Applier from the puzzle-piece menu, then click its icon to open the side panel. It needs Chrome 114 or newer. Sign in with Google, add your resume, and you are ready.",
  },
  {
    id: "does-it-apply",
    q: "Does Applier submit applications for me?",
    a: "No. Applier prepares a tailored resume. You download it and apply on the employer's own site, so you stay in control of what you send.",
  },
  {
    id: "detection",
    q: "How does Applier know a page is a job posting?",
    a: "When the side panel is open, it reads the text of your current tab. If the page carries structured job data it uses that. Otherwise a small AI check decides whether it is a single job posting and pulls out the role and company. It can be wrong, so you can always override it with This is a job page or Not a job, and you can stop a scan at any time.",
  },
  {
    id: "made-up",
    q: "Will it make things up on my resume?",
    a: "It is instructed to use only the facts in the source resume you provide: no invented employers, dates, degrees, numbers or skills. It rewords and reorders to match the job. Language models can still make mistakes, so read the result before you send it. You can ask for changes in plain words or edit every field by hand.",
  },
  {
    id: "credits",
    q: "What counts as an application?",
    a: "An application is counted when you first download a tailored resume. Generating a draft, previewing it, editing it and re-downloading it are all free. One credit is one application.",
  },
  {
    id: "pricing",
    q: "How much does it cost?",
    a: `Your first ${pricing.freeCredits} applications are free. After that, credits cost ${money(pricing.perApplication)} each with a ${money(pricing.minimumCharge)} minimum purchase (${pricing.minimumCredits} credits). There is no subscription. Payments are handled by Stripe.`,
  },
  {
    id: "formats",
    q: "Which formats can I upload and download?",
    a: "Upload your source resume as PDF, DOCX, Markdown or plain text, up to 5 MB. Scanned PDFs have no readable text, so paste the text instead. Tailored resumes download as PDF, DOCX, Markdown or TXT.",
  },
  {
    id: "one-page",
    q: "Why is the resume always one page, and what if mine is longer?",
    a: "Applier fits every PDF and DOCX on one page. It first shrinks the type and spacing to a readable minimum of 8pt. If that is not enough, it removes the least important items, such as certifications, projects and older bullet points, and tells you what it removed. Your source resume is never changed.",
  },
  {
    id: "data",
    q: "What data does Applier read and keep?",
    a: "While the panel is open it reads the text of the tab you are on and sends it to our server to check whether it is a job posting. That text is not saved unless you generate a resume for the page, in which case the job description is kept with that application. We store your Google account basics, your source resume and your tailored resumes. Read the privacy page for details.",
  },
  {
    id: "delete",
    q: "Can I delete my data?",
    a: "Yes. Email us and we will delete your account and the resumes stored with it. A delete button inside the extension is not available yet.",
  },
  {
    id: "failures",
    q: "What if the AI request fails?",
    a: "Credits are only used when you download, so a failed or poor draft costs nothing. Try again, ask for an edit, or fix it by hand.",
  },
];
