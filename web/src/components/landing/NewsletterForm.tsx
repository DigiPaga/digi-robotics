"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

type State = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const email = String(new FormData(form).get("email") ?? "");
    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not add you right now. Please try again.");
      setState("success");
      setMessage("You’re subscribed to marketplace updates.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "We could not add you right now. Please try again.");
    }
  }

  return (
    <form onSubmit={subscribe} className="relative mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row" aria-describedby="newsletter-status">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={state === "success"}
        placeholder="EMAIL ADDRESS"
        className="min-h-13 min-w-0 flex-1 rounded-full border border-white/15 bg-[#111721] px-5 py-3 font-mono text-[12px] uppercase tracking-[.1em] text-white placeholder:text-white/40 transition focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
      />
      <button type="submit" disabled={state === "submitting" || state === "success"} className="inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-white transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-default disabled:border-[var(--primary)]/40 disabled:text-[var(--primary)]">
        {state === "submitting" ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />Joining…</> : state === "success" ? "✓ You're on the list" : "Get marketplace updates"}
      </button>
      <p id="newsletter-status" role="status" aria-live="polite" className={`text-left text-[13px] leading-5 sm:absolute sm:left-0 sm:top-full sm:mt-2 ${state === "error" ? "text-[#ff9e91]" : "text-[var(--primary)]"}`}>{message}</p>
    </form>
  );
}
