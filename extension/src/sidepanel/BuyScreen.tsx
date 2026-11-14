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

  const presets = Array.from(new Set([usage.min_credits, 50, 100, 250])).filter((n) => n >= usage.min_credits).sort((a, b) => a - b);
  const [credits, setCredits] = useState(presets[0]);
  const [custom, setCustom] = useState("");
  const [phase, setPhase] = useState<"choose" | "starting" | "waiting" | "done">("choose");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(0);
  const startPaid = useRef(usage.paid_credits);
  const checkoutUrl = useRef("");

  const valid = Number.isInteger(credits) && credits >= usage.min_credits && credits <= 2000;

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

      <div className="space-y-2" role="radiogroup" aria-label="Credit packs">
        {presets.map((n) => {
          const on = credits === n && custom === "";
          return (
            <button key={n} role="radio" aria-checked={on} onClick={() => { setCredits(n); setCustom(""); }}
              className={`flex w-full items-center justify-between rounded border px-3 py-3 text-left ${on ? "border-black" : "border-gray-200 hover:border-gray-400"}`}>
              <span className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-full border ${on ? "border-black bg-black" : "border-gray-400"}`} />
                <span className="font-medium">{n} credits</span>
              </span>
              <span className="font-mono text-[12px]">{money(price(n))}</span>
            </button>
          );
        })}
        <div>
          <label className="label">Custom amount</label>
          <input className="field" inputMode="numeric" placeholder={`${usage.min_credits} or more`} value={custom}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setCustom(v);
              if (v) setCredits(Number(v));
            }} />
          {custom !== "" && Number(custom) < usage.min_credits && (
            <p className="mt-1 text-[12px] text-gray-500">Minimum purchase is {usage.min_credits} credits.</p>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
        <span className="text-gray-500">Total</span>
        <span className="text-[18px] font-semibold tracking-tight">{valid ? money(price(credits)) : "-"}</span>
      </div>

      <button className="btn-primary w-full py-2.5" disabled={!valid || phase === "starting"} onClick={start}>
        {phase === "starting" ? "Opening checkout..." : "Continue to secure checkout"}
      </button>
      <p className="text-center text-[12px] text-gray-500">Payment is handled by Stripe in a new tab. We never see your card.</p>
      {error && <p className="border-l-2 border-black pl-2">{error}</p>}
      <button className="btn-ghost w-full" onClick={onClose}>Cancel</button>
    </div>
  );
}
