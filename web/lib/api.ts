/** Origin of the Applier API, used by server-side code only. Unset in local builds that do not need it. */
export const API = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
