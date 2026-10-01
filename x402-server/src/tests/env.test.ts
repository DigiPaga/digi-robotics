import assert from "node:assert/strict";
import test from "node:test";
import { loadEnv } from "../config/env";

// Well-known Anvil development keys; they hold no value on any public network.
const BUYER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const FACILITATOR_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TREASURY = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const MUSDG = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";

function musdgEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    X402_MODE: "REAL_MUSDG_X402",
    X402_NETWORK: "eip155:421614",
    X402_ASSET_ADDRESS: MUSDG,
    X402_PAY_TO: TREASURY,
    AGENT_ALLOWED_PAY_TO: TREASURY,
    PRIVATE_KEY: BUYER_KEY,
    X402_FACILITATOR_PRIVATE_KEY: FACILITATOR_KEY,
    ...overrides,
  };
}

test("REAL_MUSDG_X402 on Arbitrum Sepolia fills MockUSDG metadata, chain id and RPC", () => {
  const env = loadEnv(musdgEnv());
  assert.equal(env.mode, "REAL_MUSDG_X402");
  assert.equal(env.chainId, 421_614);
  assert.equal(env.rpcUrl, "https://sepolia-rollup.arbitrum.io/rpc");
  assert.equal(env.assetAddress, MUSDG);
  assert.equal(env.assetName, "Mock USDG (Demo)");
  assert.equal(env.assetVersion, "1");
  assert.equal(env.assetSymbol, "mUSDG");
  assert.equal(env.assetDecimals, 6);
  assert.equal(env.facilitatorPrivateKey, FACILITATOR_KEY);
  assert.equal(env.settlementContract, undefined);
});

test("REAL_MUSDG_X402 on Robinhood Chain Testnet uses its RPC and keeps explicit overrides", () => {
  const env = loadEnv(musdgEnv({
    X402_NETWORK: "eip155:46630",
    X402_RPC_URL: "https://rpc.example.test",
    X402_SETTLEMENT_CONTRACT: "0xb7d6f2ac244c8562ced113aaf1a1a41c253fe816",
  }));
  assert.equal(env.chainId, 46_630);
  assert.equal(env.rpcUrl, "https://rpc.example.test");
  assert.equal(env.settlementContract, "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816");
});

test("REAL_MUSDG_X402 rejects networks without a MockUSDG rail", () => {
  assert.throws(() => loadEnv(musdgEnv({ X402_NETWORK: "eip155:84532" })), /eip155:421614/);
});

test("REAL_MUSDG_X402 requires an explicit token address instead of the Base USDC default", () => {
  assert.throws(() => loadEnv(musdgEnv({ X402_ASSET_ADDRESS: undefined })), /X402_ASSET_ADDRESS/);
});

test("REAL_MUSDG_X402 requires a facilitator signer", () => {
  assert.throws(() => loadEnv(musdgEnv({ X402_FACILITATOR_PRIVATE_KEY: undefined })), /X402_FACILITATOR_PRIVATE_KEY/);
});

test("REAL_MUSDG_X402 rejects a chain id that disagrees with the network", () => {
  assert.throws(() => loadEnv(musdgEnv({ X402_CHAIN_ID: "84532" })), /does not match/);
});

test("REAL_X402_TEST_ASSET keeps the Base Sepolia USDC defaults", () => {
  const env = loadEnv({ X402_PAY_TO: TREASURY, AGENT_ALLOWED_PAY_TO: TREASURY, PRIVATE_KEY: BUYER_KEY });
  assert.equal(env.mode, "REAL_X402_TEST_ASSET");
  assert.equal(env.network, "eip155:84532");
  assert.equal(env.assetName, "USDC");
  assert.equal(env.assetVersion, "2");
  assert.equal(env.facilitatorPrivateKey, undefined);
});
