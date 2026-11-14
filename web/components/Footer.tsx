import Link from "next/link";
import { footerLinks, site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-200">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-neutral-500">{site.tagline}</p>
          {site.supportEmail && <a href={`mailto:${site.supportEmail}`} className="text-sm underline">{site.supportEmail}</a>}
        </div>
        {Object.entries(footerLinks).map(([group, links]) => (
          <div key={group}>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">{group}</div>
            <ul className="space-y-2 text-sm">
              {links.map((l) => <li key={l.label}><Link href={l.href} className="hover:underline">{l.label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-neutral-500">
          <span>&copy; {new Date().getFullYear()} {site.name}</span>
          <span>Applier prepares resumes. You apply on the employer&apos;s own site.</span>
        </div>
      </div>
    </footer>
  );
}
