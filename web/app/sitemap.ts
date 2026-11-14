import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { fallbackPricing } from "@/lib/pricing";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const pages = ["", "/pricing", "/faq", "/blog", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}` }));
  const blog = getPosts(fallbackPricing).map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date) }));
  return [...pages, ...blog];
}
