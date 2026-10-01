import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createAgentDemoRouter } from "../routes/agentDemo";
import { testEnv } from "./fixtures";

// Well-known Anvil development keys; they hold no value on any public network.
const musdgEnv = {
  ...testEnv,
  mode: "REAL_MUSDG_X402",
  network: "eip155:46630",
  chainId: 46_630,
  assetAddress: "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4",
  assetName: "Mock USDG (Demo)",
  assetVersion: "1",
  assetSymbol: "mUSDG",
  rpcUrl: "http://127.0.0.1:1",
  privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  facilitatorPrivateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  settlementContract: "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816",
} as const;

test("compatibility report describes the selected mUSDG rail and in-process settlement", async () => {
  const app = express().use(createAgentDemoRouter(musdgEnv));
  const response = await request(app).get("/agent-demo/compatibility");
  assert.equal(response.status, 200);
  assert.equal(response.body.selectedMode, "REAL_MUSDG_X402");
  assert.deepEqual(response.body.selectedAsset, {
    network: "eip155:46630",
    chainId: 46_630,
    address: musdgEnv.assetAddress,
    symbol: "mUSDG",
    decimals: 6,
    transferMethod: "eip3009",
  });
  assert.equal(response.body.mockUSDG.selected, true);
  assert.deepEqual(response.body.mockUSDG.networks, ["eip155:421614", "eip155:46630"]);
  assert.equal(response.body.facilitator.url, "in-process");
  assert.deepEqual(response.body.facilitator.settlement, { via: "X402Facilitator", contract: musdgEnv.settlementContract });
  assert.equal(response.body.seller.distinctFromBuyer, true);
});

test("compatibility report keeps the hosted facilitator for the Base Sepolia test asset", async () => {
  const app = express().use(createAgentDemoRouter(testEnv));
  const response = await request(app).get("/agent-demo/compatibility");
  assert.equal(response.body.selectedMode, "REAL_X402_TEST_ASSET");
  assert.equal(response.body.mockUSDG.selected, false);
  assert.equal(response.body.facilitator.url, "https://x402.org/facilitator");
});
