import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSupportedChain, getTransactionExplorerUrl } from "@/lib/network-utils";
import { OnChainProof } from "./OnChainProof";

// Repo root is four levels up from this file: agent-demo -> components -> src -> web -> root.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

interface DeploymentRecord {
  MockUSDG: string;
  X402Facilitator: string;
  chainId: number;
}

function readDeployment(chainId: number): DeploymentRecord {
  const file = path.join(repoRoot, "contracts", "deployments", `x402-${chainId}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as DeploymentRecord;
}

const CHAINS = [
  { chainId: 421614, chainName: "Arbitrum Sepolia", explorerName: "Arbiscan" },
  { chainId: 46630, chainName: "Robinhood Chain Testnet", explorerName: "Robinhood Chain Testnet Explorer" },
] as const;

describe("OnChainProof", () => {
  it("renders the MockUSDG and X402Facilitator addresses from the deployment records, with working explorer links, for both chains", () => {
    render(<OnChainProof />);

    for (const { chainId, chainName, explorerName } of CHAINS) {
      const deployment = readDeployment(chainId);
      expect(deployment.chainId).toBe(chainId);
      const explorerBase = getSupportedChain(chainId)?.blockExplorers?.default.url;
      expect(explorerBase).toBeDefined();

      expect(screen.getByRole("article", { name: `${chainName} on-chain proof` })).toBeInTheDocument();

      const usdgLink = screen.getByRole("link", { name: `Open MockUSDG on ${explorerName}` });
      expect(usdgLink).toHaveAttribute("href", `${explorerBase}/address/${deployment.MockUSDG}`);

      const facilitatorLink = screen.getByRole("link", { name: `Open X402Facilitator on ${explorerName}` });
      expect(facilitatorLink).toHaveAttribute("href", `${explorerBase}/address/${deployment.X402Facilitator}`);
    }
  });

  it("shows a real, well-formed settled transaction link per chain and labels the section testnet", () => {
    render(<OnChainProof />);

    for (const { chainId, explorerName } of CHAINS) {
      const explorerBase = getSupportedChain(chainId)?.blockExplorers?.default.url;
      const txLink = screen.getByRole("link", { name: `Open transaction on ${explorerName}` });
      const href = txLink.getAttribute("href") ?? "";
      expect(href.startsWith(`${explorerBase}/tx/0x`)).toBe(true);
      const hash = href.slice(`${explorerBase}/tx/`.length);
      expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(href).toBe(getTransactionExplorerUrl(chainId, hash));
    }

    expect(screen.getByText("Testnet")).toBeInTheDocument();
    expect(screen.getAllByText(/· testnet/i)).toHaveLength(CHAINS.length);
  });
});
