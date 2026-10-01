import { afterEach, describe, expect, it, vi } from "vitest";
import { getZeroDevReadiness } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getZeroDevReadiness", () => {
  it("reports missing-config when no env vars are set", () => {
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "");
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_RPC_URL", "");
    expect(getZeroDevReadiness()).toEqual({ ready: false, reason: "missing-config" });
  });

  it("reports missing-config when only the project id is set", () => {
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_PROJECT_ID", "proj_123");
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "");
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_RPC_URL", "");
    expect(getZeroDevReadiness()).toEqual({ ready: false, reason: "missing-config" });
  });

  it("derives the rpc url from projectId + chainId when NEXT_PUBLIC_ZERODEV_RPC_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_PROJECT_ID", "proj_123");
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "421614");
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_RPC_URL", "");
    expect(getZeroDevReadiness()).toEqual({
      ready: true,
      projectId: "proj_123",
      rpcUrl: "https://rpc.zerodev.app/api/v3/proj_123/chain/421614",
      chainId: 421614,
    });
  });

  it("prefers an explicit NEXT_PUBLIC_ZERODEV_RPC_URL over the derived one", () => {
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_PROJECT_ID", "proj_123");
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "421614");
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_RPC_URL", "https://custom.example/rpc");
    const readiness = getZeroDevReadiness();
    expect(readiness.ready).toBe(true);
    if (readiness.ready) expect(readiness.rpcUrl).toBe("https://custom.example/rpc");
  });

  it("reports unsupported-chain for a chain id outside the supported set", () => {
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_PROJECT_ID", "proj_123");
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "1");
    vi.stubEnv("NEXT_PUBLIC_ZERODEV_RPC_URL", "https://custom.example/rpc");
    expect(getZeroDevReadiness()).toEqual({ ready: false, reason: "unsupported-chain" });
  });

  it("accepts every documented supported chain id", () => {
    for (const chainId of [421614, 42161, 46630]) {
      vi.stubEnv("NEXT_PUBLIC_ZERODEV_PROJECT_ID", "proj_123");
      vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", String(chainId));
      vi.stubEnv("NEXT_PUBLIC_ZERODEV_RPC_URL", "https://custom.example/rpc");
      expect(getZeroDevReadiness().ready).toBe(true);
    }
  });
});
