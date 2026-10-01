import type { AgentDemoEnv } from "../config/env";

export const TEST_BUYER = "0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1" as const;
export const TEST_SELLER = "0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331" as const;
export const TEST_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const testEnv: AgentDemoEnv = {
  port: 3001,
  nodeEnv: "test",
  mode: "REAL_X402_TEST_ASSET",
  network: "eip155:84532",
  chainId: 84532,
  facilitatorUrl: "https://x402.org/facilitator",
  resourceBaseUrl: "http://localhost:3001",
  payTo: TEST_SELLER,
  assetAddress: TEST_ASSET,
  assetName: "USDC",
  assetVersion: "2",
  assetSymbol: "USDC",
  assetDecimals: 6,
  priceDisplay: "0.05",
  rpcUrl: "https://sepolia.base.org",
  privateKey: undefined,
  facilitatorPrivateKey: undefined,
  settlementContract: undefined,
  maxSpendAtomic: 50_000n,
  maxTotalSpendAtomic: 50_000n,
  allowedHosts: ["localhost:3001"],
  allowedPayTo: [TEST_SELLER],
  requestTimeoutMs: 30_000,
  runTtlMs: 900_000,
  maxConcurrentRuns: 1,
};
