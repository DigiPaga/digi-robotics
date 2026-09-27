import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { DemoEvent } from "@/lib/agent-demo-client";

export function EventTimeline({ events, active }: { events: DemoEvent[]; active: boolean }) {
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
      {events.length === 0 ? (
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
                  <p className="mt-1 text-sm leading-6 text-white/62">{event.message}</p>
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
