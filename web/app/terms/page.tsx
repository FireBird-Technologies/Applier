import type { Metadata } from "next";
import { LegalPage } from "@/components/Prose";
import { money, pricing, site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms", description: "The terms for using Applier." };

export default function Terms() {
  const contact = site.supportEmail ? <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> : "the contact address in the extension's store listing";
  return (
    <LegalPage title="Terms" updated={site.updated}>
      <p>By using the Applier extension and service you agree to these terms.</p>

      <h2>What Applier does</h2>
      <p>
        Applier helps you prepare resumes for job applications. It does not submit applications for you, and it cannot promise interviews, offers or
        any particular result from employers or applicant tracking systems.
      </p>

      <h2>Your content</h2>
      <p>
        Your resumes remain yours. You give us permission to process them, including with third-party AI models, only to provide the service to you.
        You are responsible for what your resume says: review every tailored resume before you send it and make sure it is accurate. AI output can contain mistakes.
      </p>

      <h2>Credits and payments</h2>
      <ul>
        <li>You start with {pricing.freeCredits} free applications.</li>
        <li>An application is counted when you first download a tailored resume. Drafts, previews, edits and repeat downloads of the same resume do not use a credit.</li>
        <li>Additional credits cost {money(pricing.perApplication)} each with a {money(pricing.minimumCharge)} minimum purchase. Payments are processed by Stripe.</li>
        <li>Prices for future purchases may change. The price you see at checkout is the price you pay.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Do not use Applier to submit false information, to break the law, to attack or overload the service, or to resell access to it.</p>

      <h2>Availability and changes</h2>
      <p>We may change, suspend or stop parts of the service, and we may update these terms. Continued use after an update means you accept it.</p>

      <h2>Liability</h2>
      <p>
        Applier is provided as is, without warranties. To the extent the law allows, we are not liable for indirect or consequential losses, including
        lost job opportunities.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: {contact}.</p>
    </LegalPage>
  );
}
