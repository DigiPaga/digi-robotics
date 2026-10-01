"use client";

import { useOpsData } from "@/lib/ops/client/use-ops-data";
import type { ContractsSnapshot, ContractStatus, Probe } from "@/lib/ops/contracts";
import { getOpsSection } from "@/lib/ops/sections";
import { formatInteger, shortAddress } from "./format";
import { Block, LoadFailed, monoClass, Notice, SectionHeader, Status, TableScroll, tableClass, tdClass, thClass } from "./primitives";
import { CONTRACT_COLUMNS, ContractsSkeleton } from "./skeletons";
import { AddressValue } from "./ui";

const SECTION = getOpsSection("contracts");

const ROLE: Record<ContractStatus["key"], string> = {
  MockUSDG: "EIP-3009 test token",
  X402Facilitator: "x402 settlement relay",
  AgentRegistry: "Agent identity registry",
  RoboticsMarketplace: "Asset listings",
};

function text<T>(probe: Probe<T>): string | null {
  return probe.status === "ok" ? String(probe.value) : null;
}

function Details({ contract }: { contract: ContractStatus }) {
  if (contract.token) {
    const { name, symbol, version, decimals, decimalsMatch } = contract.token;
    const unreadable = [name, symbol, version, decimals].some((probe) => probe.status === "error");
    return (
      <>
        <p className="text-ops-fg">{text(name) ?? "Name unreadable"} <span className="text-ops-fg-3">({text(symbol) ?? "?"})</span></p>
        <p className="mt-0.5 text-[12.5px] text-ops-fg-3">
          EIP-712 version {text(version) ?? "?"}, {text(decimals) ?? "?"} decimals
          {decimalsMatch === false ? <span className="text-ops-bad">, expected 6</span> : null}
          {unreadable ? <span className="text-ops-warn">, some values unreadable</span> : null}
        </p>
      </>
    );
  }
  if (contract.facilitator) {
    const { settler, settlerApproved, tokenMatches, pendingOwner } = contract.facilitator;
    return (
      <>
        <p>
          {settlerApproved.status === "error"
            ? <Status tone="unknown">Settler {shortAddress(settler)} unreadable</Status>
            : settlerApproved.status === "ok" && settlerApproved.value
              ? <Status tone="ok">Settler <span className={monoClass}>{shortAddress(settler)}</span> approved</Status>
              : <Status tone="bad">Settler <span className={monoClass}>{shortAddress(settler)}</span> not approved</Status>}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ops-fg-3">
          {tokenMatches === null ? "Settled token unreadable" : tokenMatches ? "Settles MockUSDG" : <span className="text-ops-bad">Settles a different token than MockUSDG</span>}
          {pendingOwner.status === "ok" ? <span className="text-ops-warn">, ownership transfer pending to {shortAddress(pendingOwner.value)}</span> : null}
        </p>
      </>
    );
  }
  return <p className="text-ops-fg-3">No owner or pause function in this version.</p>;
}

export function ContractsSection() {
  const { data, error, loading, validating, updatedAt, refresh } = useOpsData<ContractsSnapshot>(SECTION.api);
  if (loading) return <ContractsSkeleton />;

  return (
    <>
      <SectionHeader title="Contracts" description="Deployed contracts, owners and settler status per chain." updatedAt={updatedAt} validating={validating} error={error} onRefresh={() => void refresh()} />
      {!data ? <LoadFailed onRetry={() => void refresh()} /> : (
        <>
          {error ? <div className="mt-4"><Notice role="status">The last update failed. Showing the previous result.</Notice></div> : null}
          {data.chains.map((chain) => (
            <Block key={chain.chainId} title={chain.name} aside={<span className="font-ops-mono text-[12px]">chain {chain.chainId}</span>}>
              {!chain.reachable ? <div className="mb-3"><Notice tone="bad" role="alert">The {chain.name} RPC did not answer. Values below are unknown, not absent.</Notice></div> : null}
              <TableScroll label={`Contracts on ${chain.name}`}>
                <table className={`${tableClass} min-w-[900px]`}>
                  <thead>
                    <tr>{CONTRACT_COLUMNS.map((column) => <th key={column} scope="col" className={thClass}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {chain.contracts.map((contract) => (
                      <tr key={contract.key}>
                        <th scope="row" className={`${tdClass} font-normal`}>
                          <p className="font-medium text-ops-fg">{contract.key}</p>
                          <p className="mt-0.5 text-[12.5px] text-ops-fg-3">{ROLE[contract.key]}</p>
                        </th>
                        <td className={tdClass}>
                          <AddressValue address={contract.address} explorer={chain.explorer} label={`${contract.key} address`} />
                          <p className="mt-0.5 text-[12.5px] text-ops-fg-3">block {formatInteger(contract.deployBlock)}</p>
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          {contract.codePresent === null ? <Status tone="unknown">Unknown</Status> : contract.codePresent ? <Status tone="ok">Present</Status> : <Status tone="bad">No code</Status>}
                        </td>
                        <td className={tdClass}>
                          {contract.owner.status === "ok" ? <AddressValue address={contract.owner.value} explorer={chain.explorer} label="Owner address" />
                            : contract.owner.status === "absent" ? <span className="text-ops-fg-3">None</span>
                              : <Status tone="unknown">Unknown</Status>}
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          {contract.paused.status === "ok" ? (contract.paused.value ? <Status tone="warn">Paused</Status> : <Status tone="ok">Running</Status>)
                            : contract.paused.status === "absent" ? <span className="text-ops-fg-3">Not pausable</span>
                              : <Status tone="unknown">Unknown</Status>}
                        </td>
                        <td className={tdClass}><Details contract={contract} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Block>
          ))}
          <p className="mt-4 max-w-[70ch] text-[12.5px] text-ops-fg-3">
            Addresses come from contracts/deployments and the Foundry broadcasts. Owner, pause state, token metadata and settler approval are read from the chain on every refresh.
          </p>
        </>
      )}
    </>
  );
}
