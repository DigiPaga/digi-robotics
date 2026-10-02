"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, ExternalLink, LoaderCircle, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import {
  createAgentRun,
  getAgentRun,
  getCompatibility,
  subscribeToAgentRun,
  toAgentLifecycleState,
  type CompatibilityReport,
  type DemoEvent,
  type DemoRun,
} from "@/lib/agent-demo-client";
import { agentDemoRunStorageKey, type AgentDemoChain } from "@/lib/agent-demo-chains";
import { getSupportedChain, isUsdGCompatibleSymbol } from "@/lib/network-utils";
import { normalizeWeb3Error, type NormalizedWeb3Error } from "@/lib/web3-errors";
import { showError, showSuccess, showTransactionConfirmed, showTransactionSubmitted } from "@/lib/toasts";
import { AgentRunProgress } from "./AgentRunProgress";
import { CandidatePanel } from "./CandidatePanel";
import { EventTimeline } from "./EventTimeline";
import { ModeBadge } from "./ModeBadge";
import { PaymentPanel } from "./PaymentPanel";

const TERMINAL = new Set(["unlocked", "failed"]);

interface PersistedRun {
  idempotencyKey: string;
  runId?: string;
}

function readPersistedRun(key: string): PersistedRun | undefined {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as unknown;
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Partial<PersistedRun>;
    if (typeof candidate.idempotencyKey !== "string" || candidate.idempotencyKey.length < 8) return undefined;
    return { idempotencyKey: candidate.idempotencyKey, runId: typeof candidate.runId === "string" ? candidate.runId : undefined };
  } catch {
    return undefined;
  }
}

function persistRun(key: string, value: PersistedRun): void {
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function activeLoadingLabel(state: ReturnType<typeof toAgentLifecycleState>): string {
  if (state === "discovering") return "Loading available datasets";
  if (state === "dataset_selected") return "Requesting the selected protected resource";
  if (state === "payment_required") return "Validating payment requirements";
  if (state === "authorizing") return "Preparing the bounded payment authorization";
  if (state === "settling") return "Waiting for facilitator settlement";
  if (state === "confirming") return "Verifying settlement and unlocking protected content";
  return "Waiting for live run events";
}

/**
 * One chain's agent demo. Runs live on that chain's backend, so the parent remounts this
 * component (keyed by chain) when the chain changes instead of mixing two backends' state.
 */
export function AgentDemoConsole({ chain, onActiveChange }: { chain: AgentDemoChain & { backendUrl: string }; onActiveChange?: (active: boolean) => void }) {
  const backend = chain.backendUrl;
  const storageKey = agentDemoRunStorageKey(chain.id);
  const [compatibility, setCompatibility] = useState<CompatibilityReport>();
  const [compatibilityLoading, setCompatibilityLoading] = useState(true);
  const [run, setRun] = useState<DemoRun>();
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [launching, setLaunching] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [connectionError, setConnectionError] = useState<NormalizedWeb3Error>();
  const [pendingLaunchResume, setPendingLaunchResume] = useState(false);
  const closeStream = useRef<() => void>(() => undefined);
  const submittedHash = useRef<string | undefined>(undefined);
  const notifiedUnlock = useRef<string | undefined>(undefined);

  const loadCompatibility = useCallback(async () => {
    setCompatibilityLoading(true);
    setConnectionError(undefined);
    try {
      setCompatibility(await getCompatibility(backend));
    } catch (error) {
      setConnectionError(normalizeWeb3Error(error, { operation: "x402" }));
    } finally {
      setCompatibilityLoading(false);
    }
  }, [backend]);

  const syncRun = useCallback(async (runId: string): Promise<DemoRun | undefined> => {
    try {
      const current = await getAgentRun(runId, backend);
      setRun(current);
      setEvents(current.events);
      setConnectionError(undefined);
      if (TERMINAL.has(current.state)) closeStream.current();
      return current;
    } catch (error) {
      setConnectionError(normalizeWeb3Error(error, { operation: "x402" }));
      return undefined;
    }
  }, [backend]);

  const connectToRun = useCallback((runId: string) => {
    closeStream.current();
    closeStream.current = subscribeToAgentRun(runId, {
      onEvent: (event) => {
        setEvents((current) => current.some((item) => item.sequence === event.sequence) ? current : [...current, event]);
        setRun((current) => current ? { ...current, state: event.state } : current);
        if (event.transactionHash && submittedHash.current !== event.transactionHash && event.state !== "unlocked") {
          submittedHash.current = event.transactionHash;
          showTransactionSubmitted(event.transactionHash);
        }
        if (TERMINAL.has(event.state)) {
          closeStream.current();
          void syncRun(runId);
        }
      },
      onError: () => void syncRun(runId),
    }, backend);
  }, [backend, syncRun]);

  useEffect(() => {
    let cancelled = false;
    void getCompatibility(backend)
      .then((report) => {
        if (!cancelled) setCompatibility(report);
      })
      .catch((error) => {
        if (!cancelled) setConnectionError(normalizeWeb3Error(error, { operation: "x402" }));
      })
      .finally(() => {
        if (!cancelled) setCompatibilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [backend]);

  useEffect(() => {
    const persisted = readPersistedRun(storageKey);
    if (!persisted) return () => closeStream.current();
    let cancelled = false;
    if (!persisted.runId) {
      queueMicrotask(() => {
        if (!cancelled) setPendingLaunchResume(true);
      });
      return () => {
        cancelled = true;
        closeStream.current();
      };
    }

    const restore = Promise.resolve().then(() => {
      if (!cancelled) setRestoring(true);
      return getAgentRun(persisted.runId as string, backend);
    });
    void restore
      .then((current) => {
        if (cancelled) return;
        setRun(current);
        setEvents(current.events);
        if (!TERMINAL.has(current.state)) connectToRun(current.id);
      })
      .catch((error) => {
        if (!cancelled) setConnectionError(normalizeWeb3Error(error, { operation: "x402" }));
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
      closeStream.current();
    };
  }, [backend, connectToRun, storageKey]);

  useEffect(() => {
    const hash = run?.result?.payment.transactionHash;
    if (run?.state !== "unlocked" || !hash || notifiedUnlock.current === hash) return;
    notifiedUnlock.current = hash;
    showTransactionConfirmed(hash);
    showSuccess("Settlement verified and dataset unlocked.");
  }, [run?.result?.payment.transactionHash, run?.state]);

  const lifecycle = toAgentLifecycleState(run?.state);
  const active = launching || restoring || Boolean(run && !TERMINAL.has(run.state));
  useEffect(() => { onActiveChange?.(active); }, [active, onActiveChange]);
  useEffect(() => () => onActiveChange?.(false), [onActiveChange]);
  const candidates = useMemo(() => events.findLast((event) => event.candidates)?.candidates ?? [], [events]);
  const selectedId = run?.selected?.id ?? events.findLast((event) => event.datasetId)?.datasetId;
  const supportedConfiguration = Boolean(
    compatibility &&
    compatibility.selectedMode !== "BLOCKED" &&
    getSupportedChain(compatibility.selectedAsset.network) &&
    isUsdGCompatibleSymbol(compatibility.selectedAsset.symbol),
  );
  const paymentMayHaveStarted = events.some((event) =>
    ["signing_payment", "retrying_request", "verifying", "settling"].includes(event.state) || Boolean(event.transactionHash),
  );
  const unsafeFailedRetry = run?.state === "failed" && paymentMayHaveStarted;

  async function launch() {
    if (active || !supportedConfiguration) return;
    setLaunching(true);
    setConnectionError(undefined);
    setPendingLaunchResume(false);
    setRun(undefined);
    setEvents([]);
    submittedHash.current = undefined;
    closeStream.current();

    const stored = readPersistedRun(storageKey);
    const idempotencyKey = stored && !stored.runId ? stored.idempotencyKey : crypto.randomUUID();
    persistRun(storageKey, { idempotencyKey });

    try {
      const created = await createAgentRun(idempotencyKey, backend);
      persistRun(storageKey, { idempotencyKey, runId: created.runId });
      const initial = await getAgentRun(created.runId, backend);
      setRun(initial);
      setEvents(initial.events);
      if (!TERMINAL.has(initial.state)) connectToRun(created.runId);
    } catch (error) {
      const normalized = normalizeWeb3Error(error, { operation: "x402" });
      setConnectionError(normalized);
      setPendingLaunchResume(true);
      showError(normalized.message);
    } finally {
      setLaunching(false);
    }
  }

  async function retryConnection() {
    const persisted = readPersistedRun(storageKey);
    if (!persisted?.runId) {
      await launch();
      return;
    }
    setRestoring(true);
    const current = await syncRun(persisted.runId);
    if (current && !TERMINAL.has(current.state)) connectToRun(current.id);
    setRestoring(false);
  }

  const latest = events.at(-1);
  const failed = run?.state === "failed";
  const unlocked = run?.state === "unlocked" && run.result;
  const buttonLabel = active
    ? (latest?.state ?? (restoring ? "reconnecting" : "starting")).replaceAll("_", " ").toUpperCase()
    : run ? "START NEW RUN" : pendingLaunchResume ? "RETRY SAFE LAUNCH" : "RUN AGENT DEMO";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 pb-24 sm:px-8 lg:px-12">
      <div className="mb-5"><AgentRunProgress state={lifecycle} /></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <div className="min-w-0 space-y-5">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#11151e] p-6 sm:p-9">
            <div aria-hidden="true" className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_center,oklch(0.82_0.21_130/.12),transparent_65%)]" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div className="min-w-0">
                {compatibility ? <ModeBadge mode={compatibility.selectedMode} /> : compatibilityLoading ? <span className="font-mono text-[10px] text-white/40">CHECKING COMPATIBILITY…</span> : null}
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">A bounded server agent discovers a robotics dataset, validates the HTTP 402 terms, signs only approved requirements, and unlocks access after verified settlement.</p>
              </div>
              <button onClick={() => void launch()} disabled={active || !supportedConfiguration || unsafeFailedRetry} className="group inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-3 rounded-full bg-[var(--primary)] px-7 font-mono text-xs font-semibold tracking-[.08em] text-[#10140e] shadow-[0_16px_50px_-20px_oklch(0.82_0.21_130/.75)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 md:w-auto">
                {active ? <LoaderCircle className="animate-spin" size={17} /> : run ? <RotateCcw size={17} /> : <Bot size={17} />}
                {buttonLabel}
                {!active ? <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} /> : null}
              </button>
            </div>
            {compatibility && !supportedConfiguration ? <div role="alert" className="relative mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[.07] p-4 text-sm text-amber-100"><TriangleAlert className="mt-0.5 shrink-0" size={17} /><p>The {chain.name} agent backend is not configured for a supported DigiRobotics network and USDG-compatible test asset. Launch remains disabled.</p></div> : null}
            {pendingLaunchResume && !connectionError ? <div role="status" className="relative mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm leading-6 text-white/65">A previous launch stopped before a run ID returned. Retrying reuses the same idempotency key and will not silently create a second run.</div> : null}
            {connectionError ? <div role="alert" className="relative mt-6 flex flex-col gap-4 rounded-2xl border border-red-400/25 bg-red-400/[.07] p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><TriangleAlert className="mt-0.5 shrink-0" size={17} /><p className="break-words">{connectionError.message}</p></div><button onClick={() => void (compatibility ? retryConnection() : loadCompatibility())} disabled={active} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-red-200/25 px-4 font-mono text-[10px] uppercase tracking-[.1em] hover:border-red-200/60 disabled:opacity-50"><RefreshCw size={14} /> Retry connection</button></div> : null}
            {unsafeFailedRetry ? <div role="alert" className="relative mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/[.06] p-4 text-sm leading-6 text-amber-100">This run reached payment processing. Automatic payment retry is disabled; reconnect to the same run and verify its settlement state before starting another.</div> : null}
          </div>
          <EventTimeline events={events} active={active && !connectionError} loadingLabel={launching ? "Starting an agent run" : activeLoadingLabel(lifecycle)} />
        </div>
        <div className="min-w-0 space-y-5">
          <PaymentPanel chain={chain} compatibility={compatibility} run={run} loading={compatibilityLoading && !connectionError} />
          <CandidatePanel candidates={candidates} selectedId={selectedId} loading={active && lifecycle === "discovering" && candidates.length === 0 && !connectionError} />
        </div>
      </div>

      {failed ? <section className="mt-5 rounded-3xl border border-red-400/25 bg-red-400/[.06] p-6 sm:p-8"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-red-300">Run stopped safely · {run.error?.code}</p><h2 className="mt-3 font-heading text-2xl text-white">No dataset was unlocked.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">{normalizeWeb3Error(run.error ?? new Error("Run failed"), { operation: "x402" }).message}</p><button onClick={() => void retryConnection()} disabled={restoring} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 font-mono text-[10px] uppercase tracking-[.1em] text-white/75 hover:border-[var(--primary)] hover:text-[var(--primary)]"><RefreshCw size={14} /> Recheck this run</button></section> : null}

      {unlocked ? <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--primary)]/35 bg-[var(--primary)]/[.07] p-6 sm:p-9"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div className="min-w-0"><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--primary)]"><CheckCircle2 size={15} /> settlement verified + resource unlocked</p><h2 className="mt-4 break-words font-heading text-3xl text-white sm:text-4xl">{run.result?.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">The protected access URL was issued only after the backend reported verified settlement and unlock. Transaction submission alone never reaches this state.</p>{run.result?.expiresAt ? <p className="mt-4 break-words font-mono text-[10px] text-white/40">ACCESS EXPIRES {new Date(run.result.expiresAt).toLocaleString()}</p> : null}</div>{run.result?.signedUrl ? <a href={run.result.signedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--primary)]/45 px-6 font-mono text-xs text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-[#10140e]">OPEN DATASET ACCESS <ExternalLink size={15} /></a> : null}</div></section> : null}
    </div>
  );
}
