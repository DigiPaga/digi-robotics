"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState } from "react";

type Status = { kind: "idle" | "loading" | "success" | "error"; message: string };
const fieldClass = "mt-2 min-h-13 max-w-4xl mx-auto rounded-lg border border-white/15 bg-[#111721] px-4 py-3 text-[17px] text-white placeholder:text-white/35 transition focus:border-[var(--primary)] focus:outline-none";

export function CustomDataForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setStatus({ kind: "loading", message: "Sending your request…" });
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/data-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not submit the request. Please try again.");
      setStatus({ kind: "success", message: "REQUEST RECEIVED — WE WILL CONTACT YOU TO REVIEW THE CAMPAIGN." });
      form.reset();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "We could not submit the request. Please try again." });
    }
  }

  return <form id="request-form" onSubmit={submit} className="mt-16 grid gap-6 rounded-2xl border border-white/10 bg-[#141a25] p-6 sm:p-9 lg:grid-cols-2 lg:p-12" aria-describedby="form-status">
    <div><label htmlFor="workEmail" className="font-heading text-base">Work email</label><input required type="email" autoComplete="email" id="workEmail" name="workEmail" placeholder="you@company.com" className={fieldClass} /></div>
    <div><label htmlFor="company" className="font-heading text-base">Company or project</label><input required id="company" name="company" autoComplete="organization" placeholder="Project name" className={fieldClass} /></div>
    <div><label htmlFor="dataType" className="font-heading text-base">Data type</label><select required id="dataType" name="dataType" defaultValue="" className={fieldClass}><option value="" disabled>Select a data type</option><option>Audiovisual</option><option>Software interaction</option><option>Hardware and sensor</option><option>Mixed campaign</option></select></div>
    <div><label htmlFor="captureEstimate" className="font-heading text-base">Estimated number of captures</label><input required min="1" type="number" inputMode="numeric" id="captureEstimate" name="captureEstimate" placeholder="e.g. 250" className={fieldClass} /></div>
    <div className="lg:col-span-2"><label htmlFor="scenario" className="font-heading text-base">Task or scenario</label><textarea required minLength={20} id="scenario" name="scenario" rows={4} placeholder="Describe the task, environment, and observable outcome." className={fieldClass} /></div>
    <div className="lg:col-span-2"><label htmlFor="requirements" className="font-heading text-base">Additional requirements <span className="text-white/45">(optional)</span></label><textarea id="requirements" name="requirements" rows={3} placeholder="Capture devices, camera views, acceptance criteria, or constraints." className={fieldClass} /></div>
    <div className="flex flex-col items-start gap-4 lg:col-span-2 sm:flex-row sm:items-center">
      <button disabled={status.kind === "loading"} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3 text-[15px] font-semibold uppercase tracking-[.04em] text-[#10150f] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{status.kind === "loading" ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}{status.kind === "loading" ? "Submitting…" : "Submit data request"}</button>
      <p id="form-status" role="status" aria-live="polite" className={`text-[15px] leading-6 ${status.kind === "success" ? "text-[var(--primary)]" : status.kind === "error" ? "text-[#ff9e91]" : "text-white/55"}`}>{status.message || "Requests are submitted only when a persistence endpoint is configured."}</p>
    </div>
  </form>;
}
