import Link from "next/link";
import { nav, site } from "@/lib/site";
import { ButtonLink } from "./Button";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" aria-label="Applier home"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm text-neutral-600 md:flex" aria-label="Main">
          {nav.map((n) => <Link key={n.href} href={n.href} className="hover:text-black">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <ButtonLink href={site.installUrl} external={site.installIsExternal} className="px-3.5 py-2">Add to Chrome</ButtonLink>
          <details className="relative md:hidden">
            <summary className="cursor-pointer rounded-md border border-neutral-200 px-3 py-2 text-sm">Menu</summary>
            <ul className="absolute right-0 mt-2 w-44 rounded-md border border-neutral-200 bg-white p-1 text-sm">
              {nav.map((n) => (
                <li key={n.href}><Link href={n.href} className="block rounded px-3 py-2 hover:bg-neutral-100">{n.label}</Link></li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
}
