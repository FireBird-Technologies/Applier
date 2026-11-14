import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund policy",
  description: "When Applier credits can be refunded, and how to ask.",
};

export default function Refunds() {
  const email = <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  return (
    <LegalPage title="Refund policy" updated={site.updated}>
      <p>
        Applier sells credits. One credit is used each time you generate a tailored resume. This page explains when you can get your
        money back.
      </p>

      <h2>How credits are charged</h2>
      <ul>
        <li>A credit is used when a resume is generated successfully. If generation fails, no credit is used.</li>
        <li>Editing a resume, asking for changes, undoing edits, previewing it and downloading it do not use any further credits.</li>
      </ul>

      <h2>When we refund</h2>
      <p>Credits are non-refundable once purchased, except in these cases:</p>
      <ul>
        <li>You were charged twice for the same purchase, or charged the wrong amount.</li>
        <li>A fault on our side stopped you from using credits you paid for, and we were not able to fix it.</li>
        <li>The law where you live gives you a right to a refund.</li>
      </ul>

      <h2>Free credits and promo codes</h2>
      <p>Free credits, and credits received through promotions or promo codes, have no cash value and cannot be refunded or exchanged.</p>

      <h2>How to ask</h2>
      <p>
        Email {email} from any address and include the email of your Applier account, the date and amount of the purchase, and a short
        description of what went wrong. We will look into it and reply by email.
      </p>

      <h2>How refunds are paid</h2>
      <p>
        Approved refunds go back to the original payment method through Stripe. How long they take to show up depends on your bank, and is
        usually 5 to 10 business days. Credits from a refunded purchase are removed from your account.
      </p>

      <h2>If a charge looks wrong</h2>
      <p>Please contact us first so we can put it right quickly, before you raise a dispute with your bank.</p>

      <h2>Your legal rights</h2>
      <p>Nothing in this policy limits any rights you have under consumer protection law.</p>

      <p>
        See also the <Link href="/terms" className="underline">terms</Link> and the <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
