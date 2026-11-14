import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { money, pricing, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${pricing.freeCredits} free applications, then ${money(pricing.perApplication)} per application. No subscription.`,
};

const included = [
  "Job page detection with manual override",
  "Tailored one-page resume",
  "Plain-language edits and a full manual editor",
  "PDF, DOCX, Markdown and TXT downloads",
];

export default function PricingPage() {
  const packs = [pricing.minimumCredits, 50, 100, 250];
  return (
    <div className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
      <h1 className="text-4xl font-semibold md:text-5xl" style={{ letterSpacing: "-0.04em" }}>Pay only for applications you send</h1>
      <p className="mt-4 max-w-2xl text-neutral-600">
        One credit is one application, counted when you first download a tailored resume. Drafts, previews and edits are free.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-lg border border-neutral-200 p-8">
          <div className="text-sm text-neutral-500">Start</div>
          <div className="mt-2 text-5xl font-semibold" style={{ letterSpacing: "-0.04em" }}>Free</div>
          <p className="mt-2 text-neutral-600">{pricing.freeCredits} applications, no card needed.</p>
          <ul className="mt-6 flex-1 space-y-2 text-[15px]">
            {included.map((i) => <li key={i} className="flex gap-2"><span aria-hidden>✓</span>{i}</li>)}
          </ul>
          <ButtonLink href={site.installUrl} external={site.installIsExternal} variant="ghost" className="mt-8">Add to Chrome</ButtonLink>
        </div>
        <div className="flex flex-col rounded-lg border border-black p-8">
          <div className="text-sm text-neutral-500">After that</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-semibold" style={{ letterSpacing: "-0.04em" }}>{money(pricing.perApplication)}</span>
            <span className="text-neutral-600">per application</span>
          </div>
          <p className="mt-2 text-neutral-600">{money(pricing.minimumCharge)} minimum purchase ({pricing.minimumCredits} credits).</p>
          <ul className="mt-6 flex-1 space-y-2 text-[15px]">
            {["Everything in Free", "Buy any amount from the minimum up", "Credits added as soon as payment completes","Secure checkout by Stripe"].map((i) => (
              <li key={i} className="flex gap-2"><span aria-hidden>✓</span>{i}</li>
            ))}
          </ul>
          <ButtonLink href={site.installUrl} external={site.installIsExternal} className="mt-8">Add to Chrome</ButtonLink>
        </div>
      </div>

      <h2 className="mt-20 text-2xl font-semibold" style={{ letterSpacing: "-0.03em" }}>Example purchases</h2>
      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-neutral-100 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="px-5 py-3 font-medium">Credits</th><th className="px-5 py-3 font-medium">Price</th><th className="px-5 py-3 font-medium">Per application</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {packs.map((n) => {
              const price = Math.max(pricing.minimumCharge, n * pricing.perApplication);
              return (
                <tr key={n}>
                  <td className="px-5 py-3 font-medium">{n}</td>
                  <td className="px-5 py-3">{money(price)}</td>
                  <td className="px-5 py-3 text-neutral-500">{money(price / n)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-neutral-500">
        Purchases below {pricing.minimumCredits} credits are not offered because of the {money(pricing.minimumCharge)} minimum. Questions? See the{" "}
        <Link href="/faq" className="underline">FAQ</Link>.
      </p>
    </div>
  );
}
