"use client";

import { useState } from "react";
import { useOpsData } from "@/lib/ops/client/use-ops-data";
import type { PaymentKind, PaymentsSnapshot } from "@/lib/ops/payments";
import { getOpsSection } from "@/lib/ops/sections";
import { formatAmount, formatInteger, shortHash } from "./format";
import { Block, ExternalLink, LoadFailed, monoClass, Notice, SectionHeader, Status, TableScroll, tableClass, tdClass, thClass, type Tone } from "./primitives";
import { PAYMENT_COLUMNS, PaymentsSkeleton } from "./skeletons";
import { AddressValue, RelativeTime } from "./ui";

const SECTION = getOpsSection("payments");

const KIND: Record<PaymentKind, { label: string; tone: Tone; hint: string }> = {
  settled: { label: "Settled", tone: "ok", hint: "EIP-3009 payment relayed through X402Facilitator" },
  authorization: { label: "Authorization", tone: "warn", hint: "EIP-3009 payment sent straight to the token, with no PaymentSettled record" },
  mint: { label: "Mint", tone: "unknown", hint: "Faucet mint" },
  transfer: { label: "Transfer", tone: "unknown", hint: "Plain token transfer" },
};

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-ops-line-2 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`h-7 rounded px-2.5 text-[12.5px] transition-colors duration-150 ${option.value === value ? "bg-ops-fg/[.09] font-medium text-ops-fg" : "text-ops-fg-2 hover:text-ops-fg"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PaymentsSection() {
  const { data, error, loading, validating, updatedAt, refresh } = useOpsData<PaymentsSnapshot>(SECTION.api);
  const [chainFilter, setChainFilter] = useState<number>(0);
  const [scope, setScope] = useState<"all" | "payments">("all");
  if (loading) return <PaymentsSkeleton />;

  const symbol = data?.token.symbol ?? "mUSDG";
  const rows = (data?.chains ?? [])
    .filter((chain) => chainFilter === 0 || chain.chainId === chainFilter)
    .flatMap((chain) => chain.rows.map((row) => ({ row, chain })))
    .filter(({ row }) => scope === "all" || row.kind === "settled" || row.kind === "authorization")
    .sort((a, b) => (b.row.timestamp ?? "").localeCompare(a.row.timestamp ?? "") || b.row.blockNumber - a.row.blockNumber);

  return (
    <>
      <SectionHeader title="Payments" description="x402 settlements and mUSDG transfers on both testnets." updatedAt={updatedAt} validating={validating} error={error} onRefresh={() => void refresh()} />
      {!data ? <LoadFailed onRetry={() => void refresh()} /> : (
        <>
          <dl className="grid grid-cols-2 border-b border-ops-line sm:grid-cols-4">
            {[
              { label: "Payments", value: formatInteger(data.totals.payments) },
              { label: "Volume", value: formatAmount(data.totals.volume, 6), unit: symbol },
              { label: "Unique payers", value: formatInteger(data.totals.uniquePayers) },
              { label: "Via facilitator", value: `${formatInteger(data.totals.settled)} of ${formatInteger(data.totals.payments)}` },
            ].map((item) => (
              <div key={item.label} className="py-4 pr-4">
                <dt className="text-[12.5px] text-ops-fg-3">{item.label}</dt>
                <dd className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-ops-mono text-[17px] font-medium leading-6 text-ops-fg">{item.value}</span>
                  {item.unit ? <span className="text-[12px] text-ops-fg-3">{item.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 space-y-2">
            {error ? <Notice role="status">The last update failed. Showing the previous result.</Notice> : null}
            {data.chains.filter((chain) => !chain.ok).map((chain) => (
              <Notice key={chain.chainId} tone="bad" role="alert">{chain.name}: {chain.error ?? "Logs could not be read"}. Totals leave this chain out.</Notice>
            ))}
            {data.chains.filter((chain) => chain.range?.truncated).map((chain) => (
              <Notice key={chain.chainId}>{chain.name}: the RPC limited the block range. Showing blocks {formatInteger(chain.range!.fromBlock)} to {formatInteger(chain.range!.toBlock)} only.</Notice>
            ))}
          </div>

          <Block
            title="Events"
            aside={(
              <div className="flex flex-wrap items-center gap-2">
                <Segmented label="Chain" value={chainFilter} onChange={setChainFilter} options={[{ value: 0, label: "All chains" }, ...data.chains.map((chain) => ({ value: chain.chainId, label: chain.name.replace(" Chain Testnet", "") }))]} />
                <Segmented label="Event type" value={scope} onChange={setScope} options={[{ value: "all", label: "All transfers" }, { value: "payments", label: "Payments" }]} />
              </div>
            )}
          >
            <TableScroll label="Payment events">
              <table className={`${tableClass} min-w-[980px]`}>
                <thead>
                  <tr>{PAYMENT_COLUMNS.map((column) => <th key={column} scope="col" className={`${thClass} ${column === "Amount" ? "text-right" : ""}`}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={PAYMENT_COLUMNS.length} className={`${tdClass} py-6 text-ops-fg-3`}>
                      {scope === "payments" ? "No EIP-3009 payment in this range. Switch to All transfers to see mints and plain transfers." : "No mUSDG transfer since the contracts were deployed."}
                    </td></tr>
                  ) : rows.map(({ row, chain }) => (
                    <tr key={`${row.chainId}-${row.txHash}-${row.logIndex}`} className="transition-colors duration-150 hover:bg-ops-fg/[.025]">
                      <td className={`${tdClass} whitespace-nowrap`}><RelativeTime iso={row.timestamp} className="text-ops-fg-2" /></td>
                      <td className={`${tdClass} whitespace-nowrap text-ops-fg-2`}>{chain.name.replace(" Chain Testnet", "")}</td>
                      <td className={`${tdClass} whitespace-nowrap`}><span title={KIND[row.kind].hint}><Status tone={KIND[row.kind].tone}>{KIND[row.kind].label}</Status></span></td>
                      <td className={tdClass}><AddressValue address={row.from} explorer={chain.explorer} label="Payer address" /></td>
                      <td className={tdClass}><AddressValue address={row.to} explorer={chain.explorer} label="Payee address" /></td>
                      <td className={`${tdClass} whitespace-nowrap text-right`}><span className={`${monoClass} text-ops-fg`}>{formatAmount(row.amount, 6)}</span> <span className="text-[12px] text-ops-fg-3">{symbol}</span></td>
                      <td className={tdClass}>{row.resourceId ? <span className={`${monoClass} text-ops-fg-2`} title={`Resource id ${row.resourceId}`}>{shortHash(row.resourceId)}</span> : <span className="text-ops-fg-3">None</span>}</td>
                      <td className={`${tdClass} whitespace-nowrap`}><ExternalLink href={`${chain.explorer}/tx/${row.txHash}`}><span className={monoClass}>{shortHash(row.txHash)}</span></ExternalLink></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <p className="mt-3 text-[12.5px] text-ops-fg-3">
              {data.chains.filter((chain) => chain.range).map((chain) => `${chain.name}: blocks ${formatInteger(chain.range!.fromBlock)} to ${formatInteger(chain.range!.toBlock)}, ${formatInteger(chain.rowCount)} ${chain.rowCount === 1 ? "event" : "events"}${chain.rowCount > chain.rows.length ? ` (newest ${chain.rows.length} shown)` : ""}`).join(". ")}
              {data.chains.some((chain) => chain.range) ? "." : null}
            </p>
          </Block>
        </>
      )}
    </>
  );
}
