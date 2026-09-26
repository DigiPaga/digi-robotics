import { ArrowUpRight } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export const shell = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--primary)] sm:text-[13px]">{children}</p>;
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`max-w-4xl font-heading text-[clamp(2.45rem,5vw,5.4rem)] font-medium leading-[.94] tracking-[-.045em] text-[var(--foreground)] ${className}`}>{children}</h2>;
}

export function PrimaryLink({ children, className = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-[#10150f] transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:brightness-110 ${className}`} {...props}>{children}<ArrowUpRight aria-hidden="true" size={18} /></a>;
}

export function SecondaryLink({ children, className = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-white transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:border-[var(--primary)] hover:text-[var(--primary)] ${className}`} {...props}>{children}<ArrowUpRight aria-hidden="true" size={18} /></a>;
}
