import { ExternalLink as ExternalIcon, RefreshCw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { clockTime } from "./format";

/*
 * Building blocks of the ops console that need no client hooks, so the server
 * (loading states, the sign-in screen) and the client sections share them.
 */

export type Tone = "ok" | "warn" | "bad" | "unknown";

const DOT: Record<Tone, string> = {
  ok: "bg-ops-accent",
  warn: "bg-ops-warn",
  bad: "bg-ops-bad",
  unknown: "bg-ops-fg-3/50",
};

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ops-fg",
  warn: "text-ops-warn",
  bad: "text-ops-bad",
  unknown: "text-ops-fg-3",
};

/** State is always a dot plus words, never colour alone. */
export function Status({ tone, children, className = "" }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${TONE_TEXT[tone]} ${className}`}>
      <span aria-hidden="true" className={`size-1.5 shrink-0 -translate-y-[2.5px] rounded-full ${DOT[tone]}`} />
      <span>{children}</span>
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden="true" className={`inline-block size-1.5 shrink-0 rounded-full ${DOT[tone]}`} />;
}

/** Small uppercase mono label: table headers and group labels. */
export const labelClass = "font-ops-mono text-[11px] font-medium uppercase tracking-[.08em] text-ops-fg-3";
export const monoClass = "font-ops-mono text-[12.5px] font-medium";
export const linkClass = "text-ops-fg underline decoration-ops-line-2 underline-offset-[3px] transition-colors duration-150 hover:text-ops-accent hover:decoration-ops-accent";
export const buttonClass = "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-ops-line-2 px-3 text-[13px] font-medium text-ops-fg transition-colors duration-150 hover:bg-ops-raised active:bg-ops-line-2 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButtonClass = "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-ops-accent px-3.5 text-[13px] font-semibold text-ops-ink transition-opacity duration-150 hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass = "h-9 w-full rounded-md border border-ops-line-2 bg-ops-rail px-3 text-[13px] text-ops-fg transition-colors duration-150 placeholder:text-ops-fg-3 hover:border-ops-fg-3 focus:border-ops-accent focus-visible:!outline-none";

export const tableClass = "w-full border-collapse text-left text-[13px]";
export const thClass = `${labelClass} border-b border-ops-line px-3 py-2 first:pl-0 last:pr-0 whitespace-nowrap`;
export const tdClass = "border-b border-ops-line px-3 py-2.5 align-top first:pl-0 last:pr-0";

/** Tables keep their columns on a phone and scroll sideways inside this box. */
export function TableScroll({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      {children}
    </div>
  );
}

export function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center gap-1 ${linkClass} ${className}`}>
      {children}
      <ExternalIcon size={12} aria-hidden="true" className="shrink-0 text-ops-fg-3" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function Notice({ tone = "warn", children, role }: { tone?: "warn" | "bad" | "unknown"; children: ReactNode; role?: "alert" | "status" }) {
  const colour = tone === "bad" ? "border-ops-bad/35 bg-ops-bad/[.07] text-ops-bad" : tone === "warn" ? "border-ops-warn/30 bg-ops-warn/[.06] text-ops-warn" : "border-ops-line-2 bg-ops-raised/50 text-ops-fg-2";
  return (
    <p role={role} className={`flex items-start gap-2.5 rounded-md border px-3 py-2 text-[13px] ${colour}`}>
      <TriangleAlert size={14} aria-hidden="true" className="mt-[3px] shrink-0" />
      <span className="min-w-0 text-ops-fg-2">{children}</span>
    </p>
  );
}

export interface SectionHeaderProps {
  title: string;
  description: string;
  updatedAt: number | null;
  validating: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Title row of every section. The refresh control answers at once (the icon
 * spins and the label changes) while the current data stays on screen.
 */
export function SectionHeader({ title, description, updatedAt, validating, error, onRefresh }: SectionHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-ops-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-7 tracking-[-.01em] text-ops-fg">{title}</h1>
        <p className="mt-0.5 text-[13px] text-ops-fg-2">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p aria-live="polite" className="font-ops-mono text-[12px] text-ops-fg-3">
          {validating ? "Updating" : error ? <span className="text-ops-warn">Update failed</span> : updatedAt ? <>Updated <time dateTime={new Date(updatedAt).toISOString()}>{clockTime(updatedAt)}</time></> : " "}
        </p>
        <button type="button" onClick={onRefresh} aria-busy={validating} className={buttonClass}>
          <RefreshCw size={13} aria-hidden="true" className={validating ? "ops-spin" : ""} />
          Refresh
        </button>
      </div>
    </header>
  );
}

/** A titled block inside a section. Blocks are separated by space and a hairline, not boxes. */
export function Block({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-9 scroll-mt-16 first:mt-7">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[14px] font-semibold text-ops-fg">{title}</h2>
        {aside ? <div className="text-[12.5px] text-ops-fg-3">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Label and value pairs as a two-column list with hairlines. */
export function Facts({ children }: { children: ReactNode }) {
  return <dl className="border-t border-ops-line">{children}</dl>;
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-baseline gap-4 border-b border-ops-line py-2.5 text-[13px] sm:grid-cols-[13rem_minmax(0,1fr)]">
      <dt className="text-ops-fg-3">{label}</dt>
      <dd className="min-w-0 break-words text-ops-fg">{children}</dd>
    </div>
  );
}

/** Shown when the first load failed and there is nothing cached to fall back to. */
export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-7 max-w-md">
      <Notice tone="bad" role="alert">This section could not be loaded. The server or an upstream did not answer.</Notice>
      <button type="button" onClick={onRetry} className={`mt-3 ${buttonClass}`}>Try again</button>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`ops-skeleton ${className}`} />;
}
