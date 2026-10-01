import { describe, expect, it } from "vitest";
import { getStablecoinConfig, stablecoinConfig } from "./stablecoinConfig";

describe("getStablecoinConfig", () => {
  it("returns MockUSDG for Arbitrum Sepolia, falling back to the legacy deployment without env", () => {
    const config = getStablecoinConfig(421614);
    expect(config.symbol).toBe("mUSDG");
    expect(config.decimals).toBe(6);
    expect(config.address).toBe("0x39271d08C111912B1F32465745f3123a878C83Bb");
  });

  it("returns the configured asset for Robinhood Chain Testnet", () => {
    const config = getStablecoinConfig(46630);
    expect(config.symbol).toBe("mUSDG");
  });

  it("throws for an unsupported chain id", () => {
    expect(() => getStablecoinConfig(1)).toThrow("Unsupported chain ID: 1");
  });

  it("exposes every configured chain id through the lookup table", () => {
    for (const chainId of Object.keys(stablecoinConfig).map(Number)) {
      expect(getStablecoinConfig(chainId).address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });
});
