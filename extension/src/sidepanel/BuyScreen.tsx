import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Usage } from "../api/types";
import { SuccessTick } from "./Icons";

interface Props {
  usage: Usage;
  onClose: () => void;
  onPurchased: (u: Usage) => void;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function BuyScreen({ usage, onClose, onPurchased }: Props) {
  const unit = Math.round(usage.price_per_application_usd * 100);
  const minCharge = Math.round(usage.minimum_charge_usd * 100);
  const price = (n: number) => Math.max(minCharge, n * unit); // minimum charge applies to small purchases

  // Everything here comes from the server settings, so changing prices or pack sizes needs no extension update.
  const suggestions = usage.suggested_credits;
  const sliderMax = Math.min(usage.max_credits, Math.max(...suggestions));
  const clamp = (n: number) => Math.min(sliderMax, Math.max(usage.min_credits, n));
  const [credits, setCredits] = useState(clamp(suggestions.find((n) => n >= 50) ?? usage.min_credits));
  const [phase, setPhase] = useState<"choose" | "starting" | "waiting" | "done">("choose");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(0);
  const startPaid = useRef(usage.paid_credits);
  const checkoutUrl = useRef("");

  const valid = Number.isInteger(credits) && credits >= usage.min_credits && credits <= usage.max_credits;

  const start = async () => {
    setPhase("starting"); setError("");
    try {
      const { url } = await api.createCheckout(credits);
      checkoutUrl.current = url;
      startPaid.current = usage.paid_credits;
      // Stripe Checkout is a hosted page. It opens in a normal browser tab, not inside this panel.
      await chrome.tabs.create({ url });
      setPhase("waiting");
    } catch (e) {
      setError((e as Error).message);
      setPhase("choose");
    }
  };

  // While the checkout tab is open, watch for the credits to land (webhook or success page adds them).
  useEffect(() => {
    if (phase !== "waiting") return;
    let stop = false;
    const check = async () => {
      try {
        const me = await api.me();
        if (!stop && me.usage.paid_credits > startPaid.current) {
          setAdded(me.usage.paid_credits - startPaid.current);
          setPhase("done");
          onPurchased(me.usage);
        }
      } catch { /* keep waiting */ }
    };
    const timer = setInterval(check, 3000);
    const deadline = setTimeout(() => clearInterval(timer), 10 * 60 * 1000);
    window.addEventListener("focus", check);
    return () => { stop = true; clearInterval(timer); clearTimeout(deadline); window.removeEventListener("focus", check); };
  }, [phase, onPurchased]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  if (phase === "done") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <SuccessTick />
        <div>
          <div className="text-[16px] font-semibold tracking-tight">{added} credits added</div>
          <div className="text-gray-500">You now have {usage.remaining + added} applications left.</div>
        </div>
        <button className="btn-ghost" onClick={onClose}>Done</button>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="w-full max-w-[260px] space-y-3">
          <div className="loader-track" aria-hidden><div className="loader-bar" /></div>
          <div className="text-[14px] font-medium tracking-tight">Complete your payment in the new tab</div>
          <p className="text-[12px] text-gray-500">This updates by itself as soon as the payment goes through.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => chrome.tabs.create({ url: checkoutUrl.current })}>Reopen checkout</button>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">Buy credits</h2>
        <p className="mt-1 text-gray-500">
          1 credit = 1 application. ${usage.price_per_application_usd.toFixed(2)} each, ${usage.minimum_charge_usd.toFixed(2)} minimum.
          You have {usage.remaining} left.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[30px] font-semibold tracking-tight">{credits}</span>
            <span className="ml-1.5 text-gray-500">credits</span>
          </div>
          <span className="font-mono text-[15px]">{money(price(credits))}</span>
        </div>
        <input type="range" className="range" min={usage.min_credits} max={sliderMax} step={usage.min_credits >= 10 ? 10 : 1} value={credits}
          aria-label="Number of credits" onChange={(e) => setCredits(clamp(Number(e.target.value)))} />
        <div className="flex items-center justify-between gap-1">
          {suggestions.map((n) => (
            <button key={n} onClick={() => setCredits(n)} aria-pressed={credits === n}
              className={`rounded-full border px-2.5 py-0.5 text-[12px] ${credits === n ? "border-transparent bg-black text-white" : "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary w-full py-2.5" disabled={!valid || phase === "starting"} onClick={start}>
        {phase === "starting" ? "Opening checkout..." : `Continue to checkout · ${money(price(credits))}`}
      </button>
      <p className="text-center text-[12px] text-gray-500">
        Payment is handled by Stripe in a new tab. We never see your card.
        {usage.promo_codes && " Have a promo code? Enter it on the checkout page."}
      </p>
      {error && <p className="border-l-2 border-black pl-2">{error}</p>}
      <button className="btn-ghost w-full" onClick={onClose}>Cancel</button>
    </div>
  );
}
