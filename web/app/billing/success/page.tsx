import type { Metadata } from "next";
import { API } from "@/lib/api";

export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic"; // confirms the payment on every visit

interface Result { title: string; message: string }

/** Stripe sends customers here after paying. Ask the API to confirm the payment and add the credits (it is
 *  idempotent, and Stripe's webhook adds them too, so a failure here never loses a purchase). */
async function confirm(sessionId: string | undefined): Promise<Result> {
  const later = "Your credits will appear in Applier shortly. You can close this tab.";
  if (!sessionId || !API) return { title: "Payment received", message: later };
  try {
    const res = await fetch(`${API}/api/billing/confirm?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { status: string; credits_added: number };
    if (j.status !== "paid") {
      return { title: "Payment pending", message: "Your payment has not completed yet. Credits are added as soon as it does." };
    }
    const added = j.credits_added ? `${j.credits_added} credits were added. ` : "Your credits have been added. ";
    return { title: "Payment received", message: `${added}You can close this tab and go back to Applier.` };
  } catch {
    return { title: "Payment received", message: `We could not confirm it just now, but ${later.charAt(0).toLowerCase()}${later.slice(1)}` };
  }
}

export default async function BillingSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const r = await confirm((await searchParams).session_id);
  return (
    <div className="mx-auto max-w-md px-6 pb-12 pt-28 text-center">
      <h1 className="text-3xl font-semibold" style={{ letterSpacing: "-0.03em" }}>{r.title}</h1>
      <p className="mt-3 leading-relaxed text-neutral-600">{r.message}</p>
    </div>
  );
}
