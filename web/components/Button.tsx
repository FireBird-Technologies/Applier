import Link from "next/link";
import type { ReactNode } from "react";

const base = "inline-flex items-center justify-center gap-2 rounded-md border border-black px-4 py-2.5 text-sm font-medium transition-colors";
const styles = {
  primary: `${base} bg-black text-white hover:bg-neutral-700`,
  ghost: `${base} bg-white text-black hover:bg-neutral-100`,
};

export function ButtonLink({ href, external, variant = "primary", children, className = "" }: {
  href: string; external?: boolean; variant?: keyof typeof styles; children: ReactNode; className?: string;
}) {
  const cls = `${styles[variant]} ${className}`;
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
    : <Link href={href} className={cls}>{children}</Link>;
}
