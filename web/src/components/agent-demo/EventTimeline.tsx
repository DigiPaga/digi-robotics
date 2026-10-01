import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { DemoEvent } from "@/lib/agent-demo-client";
import { Skeleton } from "@/components/ui/Skeleton";

const EVENT_SUMMARIES: Record<DemoEvent["state"], string> = {
  queued: "Run queued. No payment has been attempted.",
  preflight: "Checking the configured network, asset, wallet, and policy.",
  searching: "Discovering eligible robotics training datasets.",
  candidates_found: "Eligible dataset candidates were found.",
  selected: "The agent selected the highest-ranked eligible dataset.",
  requesting_resource: "Requesting the protected dataset resource.",
  payment_required: "The resource returned payment requirements.",
  validating_policy: "Validating the payment request against agent policy.",
  signing_payment: "Authorizing payment with the configured agent wallet.",
  retrying_request: "Retrying the protected request with payment authorization.",
  verifying: "The facilitator is verifying the payment authorization.",
  settling: "Settlement is being confirmed on the configured test network.",
  unlocked: "Verified settlement received. Dataset access is unlocked.",
  failed: "The run stopped. Review the safe error summary below.",
};

export function EventTimeline({ events, active, loadingLabel }: { events: DemoEvent[]; active: boolean; loadingLabel?: string }) {
  return (
    <div className="min-h-[420px] rounded-3xl border border-white/10 bg-[#11151e]/90 p-5 shadow-2xl shadow-black/20 sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--primary)]">Live execution bus</p>
          <p className="mt-1 text-sm text-white/65">Backend SSE · append-only</p>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-white/55">
          <span className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-[var(--primary)]" : "bg-white/25"}`} />
          {active ? "streaming" : "idle"}
        </span>
      </div>
      {events.length === 0 && active ? (
        <div className="min-h-72 rounded-2xl border border-white/10 bg-white/[.015] p-5" role="status" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--primary)]">{loadingLabel ?? "Waiting for live run events"}</p>
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((item) => <div key={item} className="grid grid-cols-[28px_1fr] gap-3"><Skeleton className="size-7 rounded-full" /><div className="space-y-2 pt-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-full" /></div></div>)}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.015] text-center">
          <div className="max-w-xs px-6">
            <Circle className="mx-auto text-white/25" size={22} />
            <p className="mt-4 font-mono text-xs leading-6 text-white/45">No scripted telemetry. Events appear only when the backend emits them.</p>
          </div>
        </div>
      ) : (
        <ol className="space-y-1" aria-live="polite">
          {events.map((event, index) => {
            const failed = event.state === "failed";
            const done = event.state === "unlocked";
            const current = index === events.length - 1 && active;
            return (
              <li key={event.sequence} className="grid grid-cols-[28px_1fr] gap-3 py-3">
                <div className="flex flex-col items-center">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border ${failed ? "border-red-400/40 bg-red-400/10 text-red-300" : done ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]" : "border-white/15 bg-white/[.04] text-white/55"}`}>
                    {failed ? <X size={13} /> : done ? <Check size={13} /> : current ? <LoaderCircle className="animate-spin" size={13} /> : <span className="font-mono text-[9px]">{event.sequence}</span>}
                  </span>
                  {index < events.length - 1 ? <span className="mt-1 h-full w-px bg-white/8" /> : null}
                </div>
                <div className="pb-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/75">{event.state.replaceAll("_", " ")}</p>
                    <time className="font-mono text-[9px] text-white/30">{new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}</time>
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-white/62">{EVENT_SUMMARIES[event.state]}</p>
                  {event.errorCode ? <p className="mt-2 font-mono text-[10px] text-red-300">{event.errorCode}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
