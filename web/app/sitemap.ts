import type { MetadataRoute } from "next";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const pages = ["", "/pricing", "/faq", "/blog", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}` }));
  const blog = posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date) }));
  return [...pages, ...blog];
}
