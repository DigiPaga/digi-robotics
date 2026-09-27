import { randomUUID } from "node:crypto";
import type { AgentDemoMode, AgentRun, AgentRunEvent, ErrorCode, RunState } from "../types/agentDemo";

type Listener = (event: AgentRunEvent) => void;

export class RunStore {
  private readonly runs = new Map<string, AgentRun>();
  private readonly idempotency = new Map<string, string>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private activeRuns = 0;
  private reservedSpendAtomic = 0n;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly ttlMs: number,
    private readonly maxConcurrentRuns: number,
    private readonly maxTotalSpendAtomic: bigint,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), Math.min(ttlMs, 60_000));
    this.cleanupTimer.unref();
  }

  create(idempotencyKey: string, mode: AgentDemoMode): { run: AgentRun; created: boolean } {
    this.cleanup();
    const existingId = this.idempotency.get(idempotencyKey);
    if (existingId) {
      const existing = this.runs.get(existingId);
      if (existing) return { run: existing, created: false };
    }
    if (this.activeRuns >= this.maxConcurrentRuns) throw new Error("CONCURRENCY_LIMIT");
    const now = new Date();
    const run: AgentRun = {
      id: randomUUID(),
      idempotencyKey,
      state: "queued",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlMs).toISOString(),
      mode,
      events: [],
      paymentStarted: false,
    };
    this.runs.set(run.id, run);
    this.idempotency.set(idempotencyKey, run.id);
    this.activeRuns += 1;
    this.emit(run.id, "queued", "Run queued. No payment has been attempted.");
    return { run, created: true };
  }

  get(id: string): AgentRun | undefined {
    this.cleanup();
    return this.runs.get(id);
  }

  emit(id: string, state: RunState, message: string, detail: Partial<AgentRunEvent> = {}): AgentRunEvent {
    const run = this.runs.get(id);
    if (!run) throw new Error("Run not found");
    run.state = state;
    run.updatedAt = new Date().toISOString();
    const event: AgentRunEvent = {
      sequence: run.events.length + 1,
      state,
      timestamp: run.updatedAt,
      message,
      mode: run.mode,
      ...detail,
    };
    run.events.push(event);
    for (const listener of this.listeners.get(id) ?? []) listener(event);
    if (state === "unlocked" || state === "failed") this.activeRuns = Math.max(0, this.activeRuns - 1);
    return event;
  }

  claimPayment(id: string, amountAtomic: bigint): boolean {
    const run = this.runs.get(id);
    if (!run || run.paymentStarted || amountAtomic <= 0n) return false;
    if (this.reservedSpendAtomic + amountAtomic > this.maxTotalSpendAtomic) return false;
    run.paymentStarted = true;
    this.reservedSpendAtomic += amountAtomic;
    return true;
  }

  fail(id: string, code: ErrorCode, message: string): void {
    const run = this.runs.get(id);
    if (!run || run.state === "failed" || run.state === "unlocked") return;
    run.error = { code, message };
    this.emit(id, "failed", message, { errorCode: code });
  }

  subscribe(id: string, listener: Listener): () => void {
    const set = this.listeners.get(id) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(id, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(id);
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, run] of this.runs) {
      if (Date.parse(run.expiresAt) > now) continue;
      this.runs.delete(id);
      this.idempotency.delete(run.idempotencyKey);
      this.listeners.delete(id);
      if (run.state !== "failed" && run.state !== "unlocked") this.activeRuns = Math.max(0, this.activeRuns - 1);
    }
  }
}
