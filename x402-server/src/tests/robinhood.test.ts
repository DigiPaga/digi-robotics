import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import express from "express";
import request from "supertest";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { unstable_readConfig } from "wrangler";
import { loadEnv } from "../config/env";
import { createAgentDemoRouter } from "../routes/agentDemo";
import { explorerTxUrl, getX402Chain } from "../x402/chains";
import { createProtectedDatasetMiddleware } from "../x402/resourceServer";

// Well-known Anvil development keys; they hold no value on any public network.
const SECRETS = {
  PRIVATE_KEY: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  X402_FACILITATOR_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  X402_PAY_TO: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  AGENT_ALLOWED_PAY_TO: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
};
const MUSDG = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";
const X402_FACILITATOR = "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816";
const HASH = `0x${"ab".repeat(32)}`;

const configPath = path.join(__dirname, "../../wrangler.jsonc");
const arbitrumWorker = unstable_readConfig({ config: configPath });
const robinhoodWorker = unstable_readConfig({ config: configPath, env: "robinhood" });

/** The env the Worker hands to loadEnv: its vars plus the uploaded secrets. */
function workerEnv(vars: Record<string, unknown>) {
  const strings = Object.fromEntries(Object.entries(vars).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  return loadEnv({ ...strings, ...SECRETS });
}

test("the robinhood wrangler environment is a separate Worker on its own domain", () => {
  assert.equal(robinhoodWorker.name, "digirobotics-x402-robinhood");
  assert.deepEqual(robinhoodWorker.routes, [{ pattern: "x402-rh.digirobotics.xyz", custom_domain: true }]);
  assert.deepEqual(robinhoodWorker.durable_objects.bindings, [{ name: "X402_SERVER", class_name: "X402Server" }]);
  assert.deepEqual(robinhoodWorker.migrations, [{ tag: "v1", new_sqlite_classes: ["X402Server"] }]);
  assert.deepEqual(robinhoodWorker.secrets?.required, arbitrumWorker.secrets?.required);
  assert.deepEqual(robinhoodWorker.compatibility_flags, ["nodejs_compat"]);
  assert.equal(robinhoodWorker.main, arbitrumWorker.main);
});

test("the robinhood Worker configuration loads as REAL_MUSDG_X402 on Robinhood Chain Testnet", () => {
  const env = workerEnv(robinhoodWorker.vars);
  assert.equal(env.mode, "REAL_MUSDG_X402");
  assert.equal(env.network, "eip155:46630");
  assert.equal(env.chainId, 46_630);
  assert.equal(env.rpcUrl, "https://rpc.testnet.chain.robinhood.com");
  assert.equal(env.assetAddress, MUSDG);
  assert.equal(env.assetSymbol, "mUSDG");
  assert.equal(env.settlementContract, X402_FACILITATOR);
  assert.equal(env.resourceBaseUrl, "https://x402-rh.digirobotics.xyz");
  assert.deepEqual(env.allowedHosts, ["x402-rh.digirobotics.xyz"]);
});

test("the default Worker configuration stays on Arbitrum Sepolia", () => {
  assert.equal(arbitrumWorker.name, "digirobotics-x402");
  const env = workerEnv(arbitrumWorker.vars);
  assert.equal(env.network, "eip155:421614");
  assert.equal(env.chainId, 421_614);
  assert.equal(env.resourceBaseUrl, "https://x402.digirobotics.xyz");
  assert.deepEqual(env.allowedHosts, ["x402.digirobotics.xyz"]);
});

test("transaction links use the explorer of the configured chain", () => {
  assert.equal(explorerTxUrl("eip155:46630", HASH), `https://explorer.testnet.chain.robinhood.com/tx/${HASH}`);
  assert.equal(explorerTxUrl("eip155:421614", HASH), `https://sepolia.arbiscan.io/tx/${HASH}`);
  assert.equal(explorerTxUrl("eip155:1", HASH), undefined);
});

test("the unpaid resource on the robinhood Worker asks for mUSDG on eip155:46630", async () => {
  const env = workerEnv(robinhoodWorker.vars);
  const app = express();
  app.use(createProtectedDatasetMiddleware(env));
  app.get("/x402/datasets/:id/content", (_req, res) => res.json({ forbidden: "protected" }));
  const response = await request(app).get("/x402/datasets/engine-assembly-pov/content").set("Accept", "application/json");
  assert.equal(response.status, 402);
  const decoded = decodePaymentRequiredHeader(response.headers["payment-required"]);
  const requirement = decoded.accepts[0];
  assert.equal(requirement?.network, "eip155:46630");
  assert.equal(requirement?.asset, MUSDG);
  assert.equal(requirement?.extra?.name, "Mock USDG (Demo)");
  assert.equal(new URL(decoded.resource!.url).host, "x402-rh.digirobotics.xyz");
});

test("the compatibility report and run preflight name Robinhood Chain Testnet", async () => {
  // An unreachable RPC: the run must stop at preflight without paying anything.
  const env = { ...workerEnv(robinhoodWorker.vars), rpcUrl: "http://127.0.0.1:1", requestTimeoutMs: 2_000 };
  const app = express().use(createAgentDemoRouter(env));

  const compatibility = await request(app).get("/agent-demo/compatibility");
  assert.equal(compatibility.body.selectedAsset.network, "eip155:46630");
  assert.equal(compatibility.body.selectedAsset.chainId, 46_630);
  assert.deepEqual(compatibility.body.facilitator.settlement, { via: "X402Facilitator", contract: X402_FACILITATOR });

  const created = await request(app).post("/agent-demo/runs").set("Idempotency-Key", "robinhood-preflight");
  assert.equal(created.status, 202);
  let run = (await request(app).get(created.body.statusUrl)).body;
  for (let attempt = 0; attempt < 200 && run.state !== "failed"; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 50));
    run = (await request(app).get(created.body.statusUrl)).body;
  }
  assert.equal(run.state, "failed");
  assert.equal(run.paymentStarted, false);
  const preflight = run.events.find((event: { state: string }) => event.state === "preflight");
  assert.match(preflight.message, new RegExp(getX402Chain("eip155:46630")!.name));
});
