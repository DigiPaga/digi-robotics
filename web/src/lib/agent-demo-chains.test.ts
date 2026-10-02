import { describe, expect, it } from "vitest";
import {
  agentDemoRunStorageKey,
  getAgentDemoChains,
  getAgentDemoTransactionUrl,
  isAgentDemoChainAvailable,
  resolveAgentDemoChain,
} from "./agent-demo-chains";

const hash = `0x${"ab".repeat(32)}`;
const both = getAgentDemoChains({ arbitrum: "https://x402.digirobotics.xyz/", robinhood: "https://x402-rh.digirobotics.xyz" });
const arbitrumOnly = getAgentDemoChains({ arbitrum: "https://x402.digirobotics.xyz" });

describe("getAgentDemoChains", () => {
  it("lists Arbitrum Sepolia first and Robinhood Chain Testnet second, with their backends", () => {
    expect(both.map((chain) => [chain.id, chain.name, chain.chainId, chain.backendUrl])).toEqual([
      ["arbitrum-sepolia", "Arbitrum Sepolia", 421614, "https://x402.digirobotics.xyz"],
      ["robinhood-testnet", "Robinhood Chain Testnet", 46630, "https://x402-rh.digirobotics.xyz"],
    ]);
  });

  it("falls back to the local backend for Arbitrum only", () => {
    const chains = getAgentDemoChains({});
    expect(chains[0]?.backendUrl).toBe("http://localhost:3001");
    expect(chains[1]?.backendUrl).toBeUndefined();
    expect(isAgentDemoChainAvailable(chains[1]!)).toBe(false);
  });

  it("treats blank or malformed Robinhood URLs as not configured", () => {
    for (const robinhood of ["", "   ", "not a url", "ftp://x402-rh.digirobotics.xyz"]) {
      expect(getAgentDemoChains({ robinhood })[1]?.backendUrl).toBeUndefined();
    }
  });
});

describe("resolveAgentDemoChain", () => {
  it("defaults to Arbitrum Sepolia", () => {
    expect(resolveAgentDemoChain(both).id).toBe("arbitrum-sepolia");
    expect(resolveAgentDemoChain(both, null).id).toBe("arbitrum-sepolia");
  });

  it("selects Robinhood Chain Testnet when it is configured", () => {
    const chain = resolveAgentDemoChain(both, "robinhood-testnet");
    expect(chain.id).toBe("robinhood-testnet");
    expect(chain.backendUrl).toBe("https://x402-rh.digirobotics.xyz");
  });

  it("falls back to Arbitrum Sepolia when Robinhood is not configured", () => {
    expect(resolveAgentDemoChain(arbitrumOnly, "robinhood-testnet").id).toBe("arbitrum-sepolia");
  });

  it("ignores unknown chain ids", () => {
    expect(resolveAgentDemoChain(both, "ethereum").id).toBe("arbitrum-sepolia");
  });
});

describe("getAgentDemoTransactionUrl", () => {
  const [arbitrum, robinhood] = both as [typeof both[number], typeof both[number]];

  it("links Arbitrum Sepolia settlements to Arbiscan", () => {
    expect(getAgentDemoTransactionUrl(arbitrum, hash, "eip155:421614")).toBe(`https://sepolia.arbiscan.io/tx/${hash}`);
  });

  it("links Robinhood Chain Testnet settlements to the Robinhood explorer", () => {
    expect(getAgentDemoTransactionUrl(robinhood, hash, "eip155:46630")).toBe(`https://explorer.testnet.chain.robinhood.com/tx/${hash}`);
  });

  it("uses the selected chain when the payload has no network", () => {
    expect(getAgentDemoTransactionUrl(robinhood, hash)).toBe(`https://explorer.testnet.chain.robinhood.com/tx/${hash}`);
    expect(getAgentDemoTransactionUrl(arbitrum, hash)).toBe(`https://sepolia.arbiscan.io/tx/${hash}`);
  });

  it("follows the network the backend reported over the selected chain", () => {
    expect(getAgentDemoTransactionUrl(arbitrum, hash, "eip155:46630")).toBe(`https://explorer.testnet.chain.robinhood.com/tx/${hash}`);
  });

  it("returns nothing for a malformed hash", () => {
    expect(getAgentDemoTransactionUrl(robinhood, "0x1234")).toBeUndefined();
  });
});

describe("agentDemoRunStorageKey", () => {
  it("keeps the original key for Arbitrum and a separate key for Robinhood", () => {
    expect(agentDemoRunStorageKey("arbitrum-sepolia")).toBe("digirobotics:agent-demo-run:v1");
    expect(agentDemoRunStorageKey("robinhood-testnet")).toBe("digirobotics:agent-demo-run:v1:robinhood-testnet");
  });
});
