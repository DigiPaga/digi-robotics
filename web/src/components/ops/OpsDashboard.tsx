"use client";

import { AlertTriangle, ExternalLink, LoaderCircle, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Eyebrow, secondaryAction } from "@/components/ui/Primitives";
import type { OpsBalancesSnapshot } from "@/lib/ops/balances";
import { showError } from "@/lib/toasts";
import { TopUpPanel, type TopUpTarget } from "./TopUpPanel";

function formatAmount(value: string | null, digits = 5): string {
  if (value === null) return "–";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function OpsDashboard({ initial, email, csrf }: { initial: OpsBalancesSnapshot; email: string; csrf: string }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState<TopUpTarget>({ address: initial.rows[0]?.wallet.address ?? "", chainId: initial.chains[0]?.id ?? 0 });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/ops/balances", { cache: "no-store" });
      if (response.status === 401) {
        // Session expired or revoked: re-render the server page, which shows sign-in.
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("Balances could not be loaded.");
      setSnapshot((await response.json()) as OpsBalancesSnapshot);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Balances could not be loaded.");
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  function selectTarget(next: TopUpTarget) {
    setTarget(next);
    document.getElementById("top-up")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const lowCount = snapshot.rows.reduce((sum, row) => sum + row.cells.filter((cell) => cell.low).length, 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Ops / Wallets</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-.03em] sm:text-5xl">Operational wallets</h1>
          <p className="mt-3 text-base text-[var(--muted-foreground)]">
            Signed in as <span className="font-mono text-sm text-white">{email}</span>
            {lowCount > 0 ? <span className="ml-3 font-mono text-xs uppercase tracking-[.12em] text-[#ffb5ac]">{lowCount} low</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs text-white/45" aria-live="polite">
            Refreshed <time dateTime={snapshot.refreshedAt}>{new Date(snapshot.refreshedAt).toLocaleTimeString()}</time>
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold disabled:opacity-50 ${secondaryAction}`}
          >
            {refreshing ? <LoaderCircle className="animate-spin" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
            Refresh
          </button>
          <form method="post" action="/ops/logout">
            <input type="hidden" name="csrf" value={csrf} />
            <button type="submit" className="min-h-11 rounded-full px-4 text-sm text-white/55 transition hover:text-white">Sign out</button>
          </form>
        </div>
      </div>

      {snapshot.warning ? (
        <p role="alert" className="flex items-start gap-3 rounded-2xl border border-[#f5b942]/30 bg-[#f5b942]/10 px-4 py-3 text-sm text-[#f5d38a]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {snapshot.warning}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[var(--surface)]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[.08] font-mono text-[11px] uppercase tracking-[.14em] text-white/45">
              <th scope="col" className="px-6 py-4 font-medium">Wallet</th>
              {snapshot.chains.map((chain) => (
                <th key={chain.id} scope="col" className="px-6 py-4 font-medium">
                  {chain.name}
                  <span className="ml-2 text-white/30">{chain.id}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.map(({ wallet, cells }) => (
              <tr key={wallet.address} className="border-b border-white/[.06] align-top last:border-b-0">
                <th scope="row" className="px-6 py-5 font-normal">
                  <p className="font-heading text-lg text-white">{wallet.label}</p>
                  <p className="mt-1 text-xs text-white/50">{wallet.role}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs text-white/70" title={wallet.address}>{shortAddress(wallet.address)}</span>
                    <CopyButton value={wallet.address} label="Address" className="!min-h-8 !min-w-8 !px-2" />
                  </div>
                  {wallet.minEth > 0 ? <p className="mt-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/35">min {wallet.minEth} ETH</p> : null}
                </th>
                {cells.map((cell) => {
                  const chain = snapshot.chains.find((item) => item.id === cell.chainId);
                  return (
                    <td key={cell.chainId} className="px-6 py-5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-heading text-xl text-white">{formatAmount(cell.eth)}</span>
                        <span className="text-xs text-white/45">ETH</span>
                        {cell.low ? <span className="rounded-full border border-[#ff6b5e]/40 bg-[#ff6b5e]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.12em] text-[#ffb5ac]">Low</span> : null}
                      </div>
                      {chain?.musdgToken ? (
                        <p className="mt-1 text-sm text-white/65">{formatAmount(cell.musdg, 2)} <span className="text-xs text-[var(--primary)]">mUSDG</span></p>
                      ) : null}
                      {cell.error ? <p className="mt-1 font-mono text-[11px] text-[#ffb5ac]">{cell.error}</p> : null}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {chain ? (
                          <a href={`${chain.explorer}/address/${wallet.address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline">
                            Explorer <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => selectTarget({ address: wallet.address, chainId: cell.chainId })}
                          className="inline-flex items-center gap-1 font-mono text-xs text-white/60 transition hover:text-[var(--primary)]"
                        >
                          <Send size={12} aria-hidden="true" /> Top up
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TopUpPanel
        wallets={snapshot.rows.map((row) => row.wallet)}
        target={target}
        onTargetChange={setTarget}
        onConfirmed={refresh}
      />
    </div>
  );
}
