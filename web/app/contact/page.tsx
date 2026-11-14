import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Applier for support, billing, privacy requests and feedback.",
};

export default function Contact() {
  const email = <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  return (
    <LegalPage title="Contact" updated={site.updated}>
      <p>The fastest way to reach us is email: {email}.</p>

      <h2>What to include</h2>
      <ul>
        <li>The email address of your Applier account (the Google account you sign in with).</li>
        <li>What you were trying to do and what happened instead. A screenshot helps.</li>
        <li>For billing questions, the date and amount of the purchase.</li>
      </ul>

      <h2>What we can help with</h2>
      <ul>
        <li><b>Using Applier:</b> a resume that did not come out right, a page that was not detected, anything that looks broken.</li>
        <li>
          <b>Billing and refunds:</b> see the <Link href="/refunds" className="underline">refund policy</Link> first, then email us with the
          details above.
        </li>
        <li>
          <b>Your data:</b> to get a copy of what we hold, correct it, or delete your account and resumes, email us from any address and
          tell us the account email. See the <Link href="/privacy" className="underline">privacy policy</Link>.
        </li>
        <li><b>Ideas and feedback:</b> we read them all.</li>
      </ul>

      <p>
        Many answers are already in the <Link href="/faq" className="underline">FAQ</Link>. We reply by email.
      </p>
    </LegalPage>
  );
}
