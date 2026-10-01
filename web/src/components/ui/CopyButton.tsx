"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { showCopySuccess, showError } from "@/lib/toasts";

export interface CopyButtonProps {
  value: string;
  label?: string;
  displayValue?: string;
  variant?: "compact" | "standard";
  className?: string;
}

async function copyPublicValue(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard fallback was unavailable");
}

export function CopyButton({
  value,
  label = "Public value",
  displayValue,
  variant = "compact",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function handleCopy() {
    try {
      await copyPublicValue(value);
      setCopied(true);
      showCopySuccess(label);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2_000);
    } catch {
      showError(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  const compact = variant === "compact";
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={`Copy ${label.toLowerCase()}`}
      title={`${label}: ${value}`}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 font-mono text-white/60 transition hover:border-[#84cc16]/55 hover:text-[#84cc16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16] ${compact ? "min-w-11 px-3 text-[10px]" : "px-4 text-[11px]"} ${className}`}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {!compact ? <span>{copied ? "Copied" : displayValue ?? "Copy"}</span> : null}
    </button>
  );
}
