export interface Pricing {
  freeCredits: number;
  perApplication: number;
  minimumCharge: number;
  minimumCredits: number;
  maxCredits: number;
  suggested: number[];
}

/** Only used when the API cannot be reached (for example a build with no backend running). The API is the source of truth. */
export const fallbackPricing: Pricing = {
  freeCredits: 10, perApplication: 0.1, minimumCharge: 3, minimumCredits: 30, maxCredits: 2000, suggested: [30, 50, 100, 250],
};

const API = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Prices come from the backend settings, so the site always matches what checkout charges. Refreshed every 5 minutes. */
export async function getPricing(): Promise<Pricing> {
  if (!API) return fallbackPricing;
  try {
    const res = await fetch(`${API}/api/pricing`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    return {
      freeCredits: j.free_credits, perApplication: j.price_per_application_usd, minimumCharge: j.minimum_charge_usd,
      minimumCredits: j.min_credits, maxCredits: j.max_credits, suggested: j.suggested_credits,
    };
  } catch {
    return fallbackPricing;
  }
}
