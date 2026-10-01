"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { showCopySuccess, showError } from "@/lib/toasts";
import { absoluteTime, relativeTime, shortAddress } from "./format";
import { linkClass, monoClass } from "./primitives";

const TICK_MS = 10_000;

function subscribeTick(listener: () => void): () => void {
  const timer = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(timer);
}

/** A clock that advances every 10 s. Null on the server, so server and first client render agree. */
function useNow(): number | null {
  return useSyncExternalStore(subscribeTick, () => Math.ceil(Date.now() / TICK_MS) * TICK_MS, () => null);
}

export function RelativeTime({ iso, className = "" }: { iso: string | null | undefined; className?: string }) {
  const now = useNow();
  if (!iso) return <span className={className}>n/a</span>;
  return <time dateTime={iso} title={absoluteTime(iso)} className={className}>{now === null ? absoluteTime(iso) : relativeTime(iso, now)}</time>;
}

export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showCopySuccess(label);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1_600);
    } catch {
      showError(`Could not copy the ${label.toLowerCase()}.`);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copy ${label.toLowerCase()} ${value}`}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-ops-fg-3 transition-colors duration-150 hover:bg-ops-raised hover:text-ops-fg"
    >
      {copied ? <Check size={13} aria-hidden="true" className="text-ops-accent" /> : <Copy size={13} aria-hidden="true" />}
    </button>
  );
}

/** Short mono address that links to the explorer, with a copy control. */
export function AddressValue({ address, explorer, label = "Address" }: { address: string; explorer?: string | null; label?: string }) {
  const text = <span className={monoClass} title={address}>{shortAddress(address)}</span>;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {explorer
        ? <a href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer noopener" className={linkClass}>{text}<span className="sr-only"> on the explorer (opens in a new tab)</span></a>
        : text}
      <CopyValue value={address} label={label} />
    </span>
  );
}

