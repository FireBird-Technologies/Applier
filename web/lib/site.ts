/** Site-wide constants. Prices are NOT here: they come from the backend (see lib/pricing.ts). */
export const site = {
  name: "Applier",
  tagline: "Apply to jobs with a resume that fits.",
  description:
    "Applier is a Chrome extension that detects a job posting and writes a one-page resume tailored to it, using only the facts in your own resume.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Until the store listing exists, "Add to Chrome" points at the install steps.
  installUrl: process.env.NEXT_PUBLIC_CHROME_STORE_URL || "/faq#install",
  installIsExternal: Boolean(process.env.NEXT_PUBLIC_CHROME_STORE_URL),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@applier.site",
  updated: "November 14, 2026",
};

export const money = (n: number) => `$${n.toFixed(2)}`;

export const nav = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
];

export const footerLinks = {
  Product: [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
  ],
  Resources: [
    { href: "/faq", label: "FAQ" },
    { href: "/blog", label: "Blog" },
    { href: "/faq#install", label: "Install guide" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/refunds", label: "Refunds" },
  ],
};
