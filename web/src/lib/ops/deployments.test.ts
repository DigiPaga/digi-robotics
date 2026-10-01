// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { OPS_CHAINS } from "./chains";
import { OPS_DEPLOYMENTS, OPS_SETTLER } from "./deployments";

const contractsDir = path.resolve(__dirname, "../../../../contracts");

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(path.join(contractsDir, relative), "utf8"));
}

interface Broadcast {
  transactions: { hash: string; contractName: string | null; contractAddress: string | null; function: string | null; arguments: string[] | null }[];
  receipts: { transactionHash: string; contractAddress: string | null; blockNumber: string }[];
}

/** Creation block per contract name, from the Foundry broadcast of one script on one chain. */
function created(script: string, chainId: number): Map<string, { address: string; block: number }> {
  const run = readJson<Broadcast>(`broadcast/${script}/${chainId}/run-latest.json`);
  const out = new Map<string, { address: string; block: number }>();
  for (const receipt of run.receipts) {
    if (!receipt.contractAddress) continue;
    const tx = run.transactions.find((item) => item.hash === receipt.transactionHash);
    if (tx?.contractName) out.set(tx.contractName, { address: getAddress(receipt.contractAddress), block: Number(BigInt(receipt.blockNumber)) });
  }
  return out;
}

const MARKETPLACE_SCRIPT: Record<number, string> = { 421614: "Deploy.s.sol", 46630: "DeployRobinhood.s.sol" };

describe("ops deployment table", () => {
  it.each(OPS_CHAINS.map((chain) => chain.id))("matches contracts/deployments/x402-%i.json", (chainId) => {
    const record = readJson<{ chainId: number; MockUSDG: string; X402Facilitator: string }>(`deployments/x402-${chainId}.json`);
    expect(record.chainId).toBe(chainId);
    expect(OPS_DEPLOYMENTS[chainId].MockUSDG.address).toBe(getAddress(record.MockUSDG));
    expect(OPS_DEPLOYMENTS[chainId].X402Facilitator.address).toBe(getAddress(record.X402Facilitator));
  });

  it.each(OPS_CHAINS.map((chain) => chain.id))("matches the broadcast addresses and deploy blocks on %i", (chainId) => {
    const x402 = created("DeployX402.s.sol", chainId);
    const marketplace = created(MARKETPLACE_SCRIPT[chainId], chainId);
    const table = OPS_DEPLOYMENTS[chainId];
    for (const [name, source] of [["MockUSDG", x402], ["X402Facilitator", x402], ["AgentRegistry", marketplace], ["RoboticsMarketplace", marketplace]] as const) {
      const entry = source.get(name);
      expect(entry, `${name} missing from the broadcast`).toBeTruthy();
      expect(table[name].address).toBe(entry!.address);
      expect(table[name].deployBlock).toBe(entry!.block);
    }
  });

  it.each(OPS_CHAINS.map((chain) => chain.id))("uses the settler the deploy script approved on %i", (chainId) => {
    const run = readJson<Broadcast>(`broadcast/DeployX402.s.sol/${chainId}/run-latest.json`);
    const call = run.transactions.find((tx) => tx.function?.startsWith("setSettler"));
    expect(call?.arguments?.[0] && getAddress(call.arguments[0])).toBe(OPS_SETTLER);
    expect(call?.arguments?.[1]).toBe("true");
  });
});
