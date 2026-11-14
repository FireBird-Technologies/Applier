import type { Metadata } from "next";
import { LegalPage } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", description: "What data Applier reads, stores and shares, and who processes it." };

export default function Privacy() {
  const contact = site.supportEmail ? <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> : "the contact address in the extension's store listing";
  return (
    <LegalPage title="Privacy" updated={site.updated}>
      <p>This page explains what the Applier Chrome extension and service read, keep and share. We keep it short and specific.</p>

      <h2>What Applier reads from your browser</h2>
      <p>
        While the Applier side panel is open, it reads the visible text of the tab you are on, along with the page title, address and a few
        hints from the page&apos;s HTML (such as meta tags and whether an Apply button exists). It sends this to our server to decide whether the page
        is a job posting. If you navigate to another tab while the panel is open, it checks that page too. Close the panel and it reads nothing.
      </p>
      <p>The extension requests access to all sites for this reason. It does not read your browsing history, cookies, passwords or form entries.</p>

      <h2>What we store</h2>
      <ul>
        <li><b>Account:</b> your name, email address and profile picture from Google sign-in.</li>
        <li><b>Your resumes:</b> the text of your source resume and each tailored resume you generate.</li>
        <li><b>Applications:</b> for each resume you generate, the job page address, role, company and job description text, and whether you downloaded it.</li>
        <li><b>Usage and payments:</b> how many applications you have used, credits you bought, and a record of each purchase (amount, credits and Stripe session ID).</li>
      </ul>
      <p>Text from a page that you did not generate a resume for is used to check the page and is not saved.</p>

      <h2>Who processes your data</h2>
      <ul>
        <li><b>AI model provider:</b> job page text and your resume text are sent to a third-party AI model to detect job pages and write resumes.</li>
        <li><b>Google:</b> sign-in.</li>
        <li><b>Stripe:</b> payments. Card details go to Stripe and never reach us.</li>
        <li><b>Resend:</b> sending our emails.</li>
        <li><b>Our hosting and database providers:</b> storing the data above.</li>
      </ul>
      <p>We do not sell your data or use it for advertising.</p>

      <h2>Email</h2>
      <p>
        We send a welcome email and a notice when you run out of credits. We may also send product updates, each with an unsubscribe link that works in one click.
      </p>

      <h2>Keeping and deleting data</h2>
      <p>We keep your data until you ask us to delete it. Email {contact} and we will delete your account and the resumes stored with it.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: {contact}.</p>
    </LegalPage>
  );
}
