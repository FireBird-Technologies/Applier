import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false, follow: false } };

export default function BillingCancel() {
  return (
    <div className="mx-auto max-w-md px-6 pb-12 pt-28 text-center">
      <h1 className="text-3xl font-semibold" style={{ letterSpacing: "-0.03em" }}>Checkout cancelled</h1>
      <p className="mt-3 leading-relaxed text-neutral-600">No charge was made. You can close this tab and go back to Applier.</p>
    </div>
  );
}
