"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, ExternalLink, LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import { createAgentRun, getAgentRun, getCompatibility, subscribeToAgentRun, type CompatibilityReport, type DemoEvent, type DemoRun } from "@/lib/agent-demo-client";
import { CandidatePanel } from "./CandidatePanel";
import { EventTimeline } from "./EventTimeline";
import { ModeBadge } from "./ModeBadge";
import { PaymentPanel } from "./PaymentPanel";

const TERMINAL = new Set(["unlocked", "failed"]);

export function AgentDemoConsole() {
  const [compatibility, setCompatibility] = useState<CompatibilityReport>();
  const [run, setRun] = useState<DemoRun>();
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [launching, setLaunching] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const closeStream = useRef<() => void>(() => undefined);

  useEffect(() => {
    void getCompatibility().then(setCompatibility).catch(error => setConnectionError(error instanceof Error ? error.message : "Backend unavailable"));
    return () => closeStream.current();
  }, []);

  const active = launching || Boolean(run && !TERMINAL.has(run.state));
  const candidates = useMemo(() => events.findLast(event => event.candidates)?.candidates ?? [], [events]);
  const selectedId = run?.selected?.id ?? events.findLast(event => event.datasetId)?.datasetId;

  async function syncRun(runId: string) {
    try {
      const current = await getAgentRun(runId);
      setRun(current);
      setEvents(current.events);
      if (TERMINAL.has(current.state)) closeStream.current();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Could not reconnect to this run");
    }
  }

  async function launch() {
    if (active || compatibility?.selectedMode === "BLOCKED") return;
    setLaunching(true);
    setConnectionError(undefined);
    setRun(undefined);
    setEvents([]);
    closeStream.current();
    try {
      const created = await createAgentRun(crypto.randomUUID());
      const initial = await getAgentRun(created.runId);
      setRun(initial);
      setEvents(initial.events);
      closeStream.current = subscribeToAgentRun(created.runId, {
        onEvent: event => {
          setEvents(current => current.some(item => item.sequence === event.sequence) ? current : [...current, event]);
          setRun(current => current ? { ...current, state: event.state } : current);
          if (TERMINAL.has(event.state)) {
            closeStream.current();
            void syncRun(created.runId);
          }
        },
        onError: () => void syncRun(created.runId),
      });
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Run could not be started");
    } finally {
      setLaunching(false);
    }
  }

  const latest = events.at(-1);
  const failed = run?.state === "failed";
  const unlocked = run?.state === "unlocked" && run.result;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 pb-24 sm:px-8 lg:px-12">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#11151e] p-6 sm:p-9">
            <div aria-hidden className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_center,oklch(0.82_0.21_130/.12),transparent_65%)]" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                {compatibility ? <ModeBadge mode={compatibility.selectedMode} /> : <span className="font-mono text-[10px] text-white/40">CHECKING COMPATIBILITY…</span>}
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">A bounded server agent discovers a robotics dataset, validates the HTTP 402 terms, signs an EIP-3009 authorization, and unlocks access only after facilitator settlement.</p>
              </div>
              <button onClick={() => void launch()} disabled={active || !compatibility || compatibility.selectedMode === "BLOCKED"} className="group inline-flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-full bg-[var(--primary)] px-7 font-mono text-xs font-semibold tracking-[.08em] text-[#10140e] shadow-[0_16px_50px_-20px_oklch(0.82_0.21_130/.75)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
                {active ? <LoaderCircle className="animate-spin" size={17} /> : run ? <RotateCcw size={17} /> : <Bot size={17} />}
                {active ? (latest?.state ?? "STARTING").replaceAll("_", " ").toUpperCase() : run ? "RUN AGAIN" : "RUN AGENT DEMO"}
                {!active ? <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} /> : null}
              </button>
            </div>
            {connectionError ? <div className="relative mt-6 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-400/[.07] p-4 text-sm text-red-100"><TriangleAlert className="mt-0.5 shrink-0" size={17} /><p>{connectionError}</p></div> : null}
          </div>
          <EventTimeline events={events} active={active} />
        </div>
        <div className="space-y-5">
          <PaymentPanel compatibility={compatibility} run={run} />
          <CandidatePanel candidates={candidates} selectedId={selectedId} />
        </div>
      </div>

      {failed ? <section className="mt-5 rounded-3xl border border-red-400/25 bg-red-400/[.06] p-6 sm:p-8"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-red-300">Run stopped safely · {run.error?.code}</p><h2 className="mt-3 font-heading text-2xl text-white">No dataset was unlocked.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">{run.error?.message}</p></section> : null}

      {unlocked ? <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--primary)]/35 bg-[var(--primary)]/[.07] p-6 sm:p-9"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--primary)]"><CheckCircle2 size={15} /> settled + unlocked</p><h2 className="mt-4 font-heading text-3xl text-white sm:text-4xl">{run.result?.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">This short-lived access URL was absent from the catalog and initial 402 response. It was issued only after the server received a successful facilitator settlement receipt.</p>{run.result?.expiresAt ? <p className="mt-4 font-mono text-[10px] text-white/40">EXPIRES {new Date(run.result.expiresAt).toLocaleString()}</p> : null}</div>{run.result?.signedUrl ? <a href={run.result.signedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--primary)]/45 px-6 font-mono text-xs text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-[#10140e]">OPEN DATASET ACCESS <ExternalLink size={15} /></a> : null}</div></section> : null}
    </div>
  );
}
