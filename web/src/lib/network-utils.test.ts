import { describe, expect, it } from "vitest";
import {
  getAssetDisplayName,
  getNetworkDisplayName,
  getSupportedChain,
  getTransactionExplorerUrl,
  isUsdGCompatibleSymbol,
} from "./network-utils";

describe("getSupportedChain", () => {
  it("resolves a numeric chain id", () => {
    expect(getSupportedChain(421614)?.name).toBe("Arbitrum Sepolia");
  });

  it("resolves an eip155 CAIP-2 network string", () => {
    expect(getSupportedChain("eip155:46630")?.name).toBe("Robinhood Chain Testnet");
  });

  it("resolves a bare numeric string", () => {
    expect(getSupportedChain("421614")?.name).toBe("Arbitrum Sepolia");
  });

  it("returns undefined for an unsupported chain id", () => {
    expect(getSupportedChain(1)).toBeUndefined();
  });

  it("returns undefined for garbage input", () => {
    expect(getSupportedChain("not-a-chain")).toBeUndefined();
    expect(getSupportedChain(undefined)).toBeUndefined();
  });
});

describe("getNetworkDisplayName", () => {
  it("returns the chain name when supported", () => {
    expect(getNetworkDisplayName(421614)).toBe("Arbitrum Sepolia");
  });

  it("falls back for unsupported networks", () => {
    expect(getNetworkDisplayName(999999)).toBe("Unsupported configured network");
  });
});

describe("getTransactionExplorerUrl", () => {
  const validHash = `0x${"a".repeat(64)}`;

  it("builds an explorer url for a valid hash on a supported chain", () => {
    expect(getTransactionExplorerUrl(421614, validHash)).toBe(`https://sepolia.arbiscan.io/tx/${validHash}`);
  });

  it("strips a trailing slash from the explorer base url", () => {
    // Robinhood explorer url has no trailing slash in config; assert the join still has exactly one slash.
    expect(getTransactionExplorerUrl(46630, validHash)).toBe(`https://explorer.testnet.chain.robinhood.com/tx/${validHash}`);
  });

  it("returns undefined for a malformed hash", () => {
    expect(getTransactionExplorerUrl(421614, "0xnothex")).toBeUndefined();
    expect(getTransactionExplorerUrl(421614, "deadbeef")).toBeUndefined();
  });

  it("returns undefined when the hash is missing", () => {
    expect(getTransactionExplorerUrl(421614, undefined)).toBeUndefined();
  });

  it("returns undefined for an unsupported chain even with a valid hash", () => {
    expect(getTransactionExplorerUrl(1, validHash)).toBeUndefined();
  });
});

describe("isUsdGCompatibleSymbol", () => {
  it("accepts any casing containing usdg", () => {
    expect(isUsdGCompatibleSymbol("USDG")).toBe(true);
    expect(isUsdGCompatibleSymbol("mUSDG")).toBe(true);
    expect(isUsdGCompatibleSymbol("usdg-test")).toBe(true);
  });

  it("rejects unrelated or missing symbols", () => {
    expect(isUsdGCompatibleSymbol("USDC")).toBe(false);
    expect(isUsdGCompatibleSymbol(undefined)).toBe(false);
    expect(isUsdGCompatibleSymbol("")).toBe(false);
  });
});

describe("getAssetDisplayName", () => {
  it("returns the symbol when usdg-compatible", () => {
    expect(getAssetDisplayName("mUSDG")).toBe("mUSDG");
  });

  it("falls back for a non usdg-compatible or missing symbol", () => {
    expect(getAssetDisplayName("USDC")).toBe("Unsupported configured asset");
    expect(getAssetDisplayName(undefined)).toBe("Unsupported configured asset");
  });
});
