"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import type { OpsBalancesSnapshot } from "@/lib/ops/balances";
import { useOpsData } from "@/lib/ops/client/use-ops-data";
import { getOpsSection } from "@/lib/ops/sections";
import { TopUpPanel, type TopUpTarget } from "../TopUpPanel";
import { formatAmount } from "./format";
import { Block, ExternalLink, LoadFailed, monoClass, Notice, SectionHeader, Status, TableScroll, tableClass, tdClass, thClass } from "./primitives";
import { WalletsSkeleton } from "./skeletons";
import { AddressValue } from "./ui";

const SECTION = getOpsSection("wallets");

export function WalletsSection() {
  const { data, error, loading, validating, updatedAt, refresh } = useOpsData<OpsBalancesSnapshot>(SECTION.api);
  const [picked, setPicked] = useState<TopUpTarget | null>(null);
  if (loading) return <WalletsSkeleton />;

  const target: TopUpTarget = picked ?? { address: data?.rows[0]?.wallet.address ?? "", chainId: data?.chains[0]?.id ?? 0 };
  const lowCount = data?.rows.reduce((sum, row) => sum + row.cells.filter((cell) => cell.low).length, 0) ?? 0;

  function topUp(next: TopUpTarget) {
    setPicked(next);
    document.getElementById("top-up")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <SectionHeader title="Wallets" description="ETH and mUSDG balances of the operational wallets." updatedAt={updatedAt} validating={validating} error={error} onRefresh={() => void refresh()} />
      {!data ? <LoadFailed onRetry={() => void refresh()} /> : (
        <>
          <Block title="Balances" aside={lowCount > 0 ? <Status tone="bad">{lowCount} below minimum</Status> : <Status tone="ok">All above minimum</Status>}>
            {data.warning ? <div className="mb-3"><Notice role="alert">{data.warning}</Notice></div> : null}
            {error ? <div className="mb-3"><Notice role="status">The last update failed. Showing the previous result.</Notice></div> : null}
            <TableScroll label="Wallet balances">
              <table className={`${tableClass} min-w-[680px]`}>
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>Wallet</th>
                    {data.chains.map((chain) => (
                      <th key={chain.id} scope="col" className={thClass}>{chain.name} <span className="text-ops-fg-3/70">{chain.id}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(({ wallet, cells }) => (
                    <tr key={wallet.address}>
                      <th scope="row" className={`${tdClass} font-normal`}>
                        <p className="font-medium text-ops-fg">{wallet.label}</p>
                        <p className="mt-0.5 text-[12.5px] text-ops-fg-3">{wallet.role || "No role set"}</p>
                        <p className="mt-1 flex items-center gap-3">
                          <AddressValue address={wallet.address} />
                          {wallet.minEth > 0 ? <span className="text-[12px] text-ops-fg-3">min {wallet.minEth} ETH</span> : null}
                        </p>
                      </th>
                      {cells.map((cell) => {
                        const chain = data.chains.find((item) => item.id === cell.chainId);
                        return (
                          <td key={cell.chainId} className={tdClass}>
                            <p className="flex flex-wrap items-baseline gap-x-2">
                              <span className={`${monoClass} !text-[14px] text-ops-fg`}>{formatAmount(cell.eth)}</span>
                              <span className="text-[12px] text-ops-fg-3">ETH</span>
                              {cell.low ? <Status tone="bad" className="text-[12px] font-medium">Low</Status> : null}
                            </p>
                            {chain?.musdgToken ? (
                              <p className="mt-0.5 flex items-baseline gap-x-2">
                                <span className={`${monoClass} text-ops-fg-2`}>{formatAmount(cell.musdg, 2)}</span>
                                <span className="text-[12px] text-ops-fg-3">mUSDG</span>
                              </p>
                            ) : null}
                            {cell.error ? <p className="mt-0.5 text-[12.5px] text-ops-warn">{cell.error}</p> : null}
                            <p className="mt-1.5 flex flex-wrap items-center gap-4 text-[12.5px]">
                              {chain ? <ExternalLink href={`${chain.explorer}/address/${wallet.address}`}>Explorer</ExternalLink> : null}
                              <button type="button" onClick={() => topUp({ address: wallet.address, chainId: cell.chainId })} className="inline-flex items-center gap-1 rounded-sm text-ops-fg-2 transition-colors duration-150 hover:text-ops-accent">
                                <Send size={12} aria-hidden="true" /> Top up<span className="sr-only"> {wallet.label} on {chain?.name}</span>
                              </button>
                            </p>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Block>
          <TopUpPanel wallets={data.rows.map((row) => row.wallet)} target={target} onTargetChange={setPicked} onConfirmed={refresh} />
        </>
      )}
    </>
  );
}
