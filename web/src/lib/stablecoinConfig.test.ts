import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("Arbitrum Sepolia MockUSDG address from env", () => {
  const GENERIC = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const PER_CHAIN = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  async function arbitrumAddress(env: Record<string, string | undefined>): Promise<string> {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.resetModules();
    const fresh = await import("./stablecoinConfig");
    return fresh.getStablecoinConfig(421614).address;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefers the per-chain variable when it is set", async () => {
    expect(await arbitrumAddress({ NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: PER_CHAIN, NEXT_PUBLIC_MOCK_USDG_ADDRESS: GENERIC })).toBe(PER_CHAIN);
  });

  it.each(["", "   "])("falls back to the generic variable when the per-chain one is %j", async (blank) => {
    expect(await arbitrumAddress({ NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: blank, NEXT_PUBLIC_MOCK_USDG_ADDRESS: GENERIC })).toBe(GENERIC);
  });

  it("falls back to the legacy deployment when both are blank", async () => {
    expect(await arbitrumAddress({ NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: "", NEXT_PUBLIC_MOCK_USDG_ADDRESS: "" })).toBe("0x39271d08C111912B1F32465745f3123a878C83Bb");
  });
});
