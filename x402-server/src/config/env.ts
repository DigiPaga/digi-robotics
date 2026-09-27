import dotenv from "dotenv";
import { getAddress, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

dotenv.config();

const addressSchema = z.string().refine(isAddress, "must be a valid EVM address").transform(value => getAddress(value));
const privateKeySchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "must be a 32-byte hex private key");

const rawEnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  X402_MODE: z.enum(["REAL_MUSDG_X402", "REAL_X402_TEST_ASSET", "BLOCKED"]).default("REAL_X402_TEST_ASSET"),
  X402_NETWORK: z.string().regex(/^eip155:\d+$/).default("eip155:84532"),
  X402_CHAIN_ID: z.coerce.number().int().positive().default(84_532),
  X402_FACILITATOR_URL: z.string().url().default("https://x402.org/facilitator"),
  X402_RESOURCE_BASE_URL: z.string().url().default("http://localhost:3001"),
  X402_PAY_TO: addressSchema,
  X402_ASSET_ADDRESS: addressSchema.default("0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
  X402_ASSET_NAME: z.string().min(1).max(64).default("USDC"),
  X402_ASSET_VERSION: z.string().min(1).max(16).default("2"),
  X402_ASSET_SYMBOL: z.string().min(1).max(16).default("USDC"),
  X402_ASSET_DECIMALS: z.coerce.number().int().min(0).max(36).default(6),
  X402_PRICE_DISPLAY: z.string().regex(/^\d+(\.\d+)?$/).default("0.05"),
  X402_RPC_URL: z.string().url().default("https://sepolia.base.org"),
  PRIVATE_KEY: privateKeySchema.optional(),
  AGENT_MAX_SPEND_ATOMIC: z.string().regex(/^\d+$/).default("50000"),
  AGENT_MAX_TOTAL_SPEND_ATOMIC: z.string().regex(/^\d+$/).default("50000"),
  AGENT_ALLOWED_HOSTS: z.string().min(1).default("localhost:3001"),
  AGENT_ALLOWED_PAY_TO: z.string().min(1),
  AGENT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(30_000),
  AGENT_RUN_TTL_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(900_000),
  AGENT_MAX_CONCURRENT_RUNS: z.coerce.number().int().min(1).max(20).default(3),
  NEXT_PUBLIC_UNUSED: z.string().optional(),
});

export type AgentDemoEnv = ReturnType<typeof loadEnv>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = rawEnvSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid x402 server configuration: ${fields}`);
  }

  const value = parsed.data;
  if (value.X402_MODE !== "BLOCKED" && !value.PRIVATE_KEY) {
    throw new Error("Invalid x402 server configuration: PRIVATE_KEY is required for a real buyer mode");
  }
  const allowedPayTo = value.AGENT_ALLOWED_PAY_TO.split(",").map(item => item.trim()).filter(Boolean);
  if (allowedPayTo.length === 0 || allowedPayTo.some(item => !isAddress(item))) {
    throw new Error("Invalid x402 server configuration: AGENT_ALLOWED_PAY_TO must contain valid EVM addresses");
  }
  const allowedHosts = value.AGENT_ALLOWED_HOSTS.split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  if (allowedHosts.length === 0) {
    throw new Error("Invalid x402 server configuration: AGENT_ALLOWED_HOSTS must not be empty");
  }

  const agentAddress = value.PRIVATE_KEY ? privateKeyToAccount(value.PRIVATE_KEY as `0x${string}`).address : undefined;
  if (agentAddress && getAddress(agentAddress) === value.X402_PAY_TO) {
    throw new Error("Invalid x402 server configuration: X402_PAY_TO must differ from the buyer agent address");
  }
  if (!allowedPayTo.some(item => getAddress(item) === value.X402_PAY_TO)) {
    throw new Error("Invalid x402 server configuration: X402_PAY_TO is not in AGENT_ALLOWED_PAY_TO");
  }
  if (BigInt(value.AGENT_MAX_TOTAL_SPEND_ATOMIC) < BigInt(value.AGENT_MAX_SPEND_ATOMIC)) {
    throw new Error("Invalid x402 server configuration: AGENT_MAX_TOTAL_SPEND_ATOMIC must be at least AGENT_MAX_SPEND_ATOMIC");
  }

  return {
    port: value.PORT,
    nodeEnv: value.NODE_ENV,
    mode: value.X402_MODE,
    network: value.X402_NETWORK as `eip155:${number}`,
    chainId: value.X402_CHAIN_ID,
    facilitatorUrl: value.X402_FACILITATOR_URL.replace(/\/$/, ""),
    resourceBaseUrl: value.X402_RESOURCE_BASE_URL.replace(/\/$/, ""),
    payTo: value.X402_PAY_TO,
    assetAddress: value.X402_ASSET_ADDRESS,
    assetName: value.X402_ASSET_NAME,
    assetVersion: value.X402_ASSET_VERSION,
    assetSymbol: value.X402_ASSET_SYMBOL,
    assetDecimals: value.X402_ASSET_DECIMALS,
    priceDisplay: value.X402_PRICE_DISPLAY,
    rpcUrl: value.X402_RPC_URL,
    privateKey: value.PRIVATE_KEY as `0x${string}` | undefined,
    maxSpendAtomic: BigInt(value.AGENT_MAX_SPEND_ATOMIC),
    maxTotalSpendAtomic: BigInt(value.AGENT_MAX_TOTAL_SPEND_ATOMIC),
    allowedHosts,
    allowedPayTo: allowedPayTo.map(getAddress),
    requestTimeoutMs: value.AGENT_REQUEST_TIMEOUT_MS,
    runTtlMs: value.AGENT_RUN_TTL_MS,
    maxConcurrentRuns: value.AGENT_MAX_CONCURRENT_RUNS,
  } as const;
}

let cachedEnv: AgentDemoEnv | undefined;

export function getEnv(): AgentDemoEnv {
  cachedEnv ??= loadEnv();
  return cachedEnv;
}
