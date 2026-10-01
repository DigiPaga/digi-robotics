/**
 * End-to-end REAL_MUSDG_X402 run against a local Anvil chain.
 *
 * Builds and deploys contracts/ (MockUSDG + X402Facilitator), starts the real Express app with the
 * in-process facilitator, then lets the server-side agent discover, pay (x402 v2 exact, EIP-3009)
 * and unlock a dataset. Runs once with settlement straight to the token and once through the
 * X402Facilitator contract. Requires Foundry (`anvil`, `forge`) on PATH:
 *
 *   npm run test:e2e
 */
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import path from "node:path";
import { after, before, test } from "node:test";
import { createPublicClient, createWalletClient, defineChain, erc20Abi, http, parseEventLogs, type Abi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createApp } from "../app";
import { loadEnv } from "../config/env";
import { X402Buyer } from "../agent/x402Buyer";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { PaymentRequired } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { resourceIdFor, x402FacilitatorAbi } from "../x402/settlementContractScheme";

// Well-known Anvil development keys; they hold no value on any public network.
const DEPLOYER_KEY: Hex = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const BUYER_KEY: Hex = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const TREASURY: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const CHAIN_ID = 421_614; // Anvil pretends to be Arbitrum Sepolia so the mUSDG rail is selected.
const PORT = 18_545 + Math.floor(Math.random() * 1_000);
const RPC_URL = `http://127.0.0.1:${PORT}`;
const CONTRACTS_DIR = path.resolve(__dirname, "../../../contracts");

const chain = defineChain({ id: CHAIN_ID, name: "Anvil", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } });
const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
const deployer = createWalletClient({ account: privateKeyToAccount(DEPLOYER_KEY), chain, transport: http(RPC_URL) });
const buyerWallet = createWalletClient({ account: privateKeyToAccount(BUYER_KEY), chain, transport: http(RPC_URL) });

let anvil: ChildProcess;
let token: Address;
let settlementContract: Address;

function artifact(file: string, name: string): { abi: Abi; bytecode: Hex } {
  const json = JSON.parse(readFileSync(path.join(CONTRACTS_DIR, "out", file, `${name}.json`), "utf8"));
  return { abi: json.abi, bytecode: json.bytecode.object };
}

async function deploy(file: string, name: string, args: unknown[] = []): Promise<Address> {
  const { abi, bytecode } = artifact(file, name);
  const hash = await deployer.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.ok(receipt.contractAddress);
  return receipt.contractAddress;
}

async function waitForRpc(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await publicClient.getChainId(); return; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  throw new Error("anvil did not start");
}

async function freePort(): Promise<number> {
  const probe = createServer().listen(0);
  await new Promise(resolve => probe.once("listening", resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

async function startServer(overrides: Record<string, string>) {
  const host = `127.0.0.1:${await freePort()}`;
  const env = loadEnv({
    X402_MODE: "REAL_MUSDG_X402",
    X402_NETWORK: `eip155:${CHAIN_ID}`,
    X402_RPC_URL: RPC_URL,
    X402_ASSET_ADDRESS: token,
    X402_FACILITATOR_URL: "http://127.0.0.1:1", // keep Bazaar discovery offline
    X402_RESOURCE_BASE_URL: `http://${host}`,
    X402_PAY_TO: TREASURY,
    AGENT_ALLOWED_PAY_TO: TREASURY,
    AGENT_ALLOWED_HOSTS: host,
    PRIVATE_KEY: BUYER_KEY,
    X402_FACILITATOR_PRIVATE_KEY: DEPLOYER_KEY,
    ...overrides,
  });
  const server = createApp(env).listen(Number(host.split(":")[1]), "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  return { env, server, baseUrl: `http://${host}` };
}

async function runAgent(baseUrl: string) {
  const created = await fetch(`${baseUrl}/agent-demo/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(res => res.json()) as { runId: string };
  for (let attempt = 0; attempt < 100; attempt++) {
    const run = await fetch(`${baseUrl}/agent-demo/runs/${created.runId}`).then(res => res.json()) as { state: string; error?: unknown; selected?: { id: string }; events: Array<{ state: string; transactionHash?: Hex; explorerUrl?: string }> };
    if (run.state === "unlocked" || run.state === "failed") return run;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("agent run did not finish");
}

before(async () => {
  execFileSync("forge", ["build", "--skip", "test"], { cwd: CONTRACTS_DIR, stdio: "ignore" });
  anvil = spawn("anvil", ["--port", String(PORT), "--chain-id", String(CHAIN_ID), "--silent"], { stdio: "ignore" });
  await waitForRpc();
  token = await deploy("MockUSDG.sol", "MockUSDG");
  settlementContract = await deploy("X402Facilitator.sol", "X402Facilitator", [token, deployer.account.address]);
  const { abi } = artifact("MockUSDG.sol", "MockUSDG");
  const hash = await buyerWallet.writeContract({ address: token, abi, functionName: "faucet" });
  await publicClient.waitForTransactionReceipt({ hash });
});

after(() => {
  anvil?.kill();
});

test("agent pays mUSDG over x402 with settlement straight to the token", async () => {
  const before = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
  const { server, baseUrl } = await startServer({});
  try {
    const run = await runAgent(baseUrl);
    assert.equal(run.state, "unlocked", JSON.stringify(run.error));
    const unlocked = run.events.find(event => event.state === "unlocked");
    const hash = unlocked?.transactionHash as Hex;
    assert.equal(unlocked?.explorerUrl, `https://sepolia.arbiscan.io/tx/${hash}`);
    const receipt = await publicClient.getTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");
    assert.equal(receipt.to?.toLowerCase(), token.toLowerCase());
    const after = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
    assert.equal(after - before, 50_000n);
  } finally {
    server.close();
  }
});

test("agent pays mUSDG over x402 with settlement through X402Facilitator", async () => {
  const before = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
  const { server, baseUrl, env } = await startServer({ X402_SETTLEMENT_CONTRACT: settlementContract });
  try {
    const run = await runAgent(baseUrl);
    assert.equal(run.state, "unlocked", JSON.stringify(run.error));
    const hash = run.events.find(event => event.state === "unlocked")?.transactionHash as Hex;
    const receipt = await publicClient.getTransactionReceipt({ hash });
    assert.equal(receipt.to?.toLowerCase(), settlementContract.toLowerCase());
    const [settled] = parseEventLogs({ abi: x402FacilitatorAbi, eventName: "PaymentSettled", logs: receipt.logs });
    assert.ok(settled);
    assert.equal(settled.args.payee, TREASURY);
    assert.equal(settled.args.amount, 50_000n);
    assert.ok(run.selected);
    assert.equal(settled.args.resourceId, resourceIdFor(`${env.resourceBaseUrl}/x402/datasets/${run.selected.id}/content`));
    const after = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
    assert.equal(after - before, 50_000n);
  } finally {
    server.close();
  }
});

/** Signs a payment for `paymentRequired`, lets `tamper` edit the payload, and sends it. */
async function payWith(url: string, paymentRequired: PaymentRequired, tamper: (payload: Awaited<ReturnType<x402HTTPClient["createPaymentPayload"]>>) => void = () => undefined) {
  const inner = new x402Client().register(`eip155:${CHAIN_ID}`, new ExactEvmScheme(privateKeyToAccount(BUYER_KEY)));
  inner.setSpendControls({ maxAmountPerPayment: false, allowedAssets: [{ network: `eip155:${CHAIN_ID}`, asset: token, maxAmountPerPayment: "50000" }] });
  const client = new x402HTTPClient(inner);
  const payload = await client.createPaymentPayload(paymentRequired);
  tamper(payload);
  return fetch(url, { headers: { ...client.encodePaymentSignatureHeader(payload), Accept: "application/json" } });
}

async function recordedResourceId(response: Response): Promise<Hex> {
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json() as { payment: { transactionHash: Hex } };
  const receipt = await publicClient.getTransactionReceipt({ hash: body.payment.transactionHash });
  const [settled] = parseEventLogs({ abi: x402FacilitatorAbi, eventName: "PaymentSettled", logs: receipt.logs });
  assert.ok(settled);
  return settled.args.resourceId;
}

test("X402Facilitator records a distinct server-derived resource id per dataset, whatever payload.resource says", async () => {
  const { server, env } = await startServer({ X402_SETTLEMENT_CONTRACT: settlementContract });
  try {
    const buyer = new X402Buyer(env);
    const urlFor = (id: string) => `${env.resourceBaseUrl}/x402/datasets/${id}/content`;
    const engine = urlFor("engine-assembly-pov");
    const kitchen = urlFor("kitchen-cooking-pov");

    const engineId = await recordedResourceId(await payWith(engine, (await buyer.requestUnpaid(engine)).paymentRequired));
    assert.equal(engineId, resourceIdFor(engine));

    // The client claims it paid for the engine dataset (and then for an arbitrary URL); the record follows the request path.
    const kitchenId = await recordedResourceId(await payWith(kitchen, (await buyer.requestUnpaid(kitchen)).paymentRequired, payload => {
      payload.resource = { url: engine, description: "", mimeType: "" };
    }));
    assert.equal(kitchenId, resourceIdFor(kitchen));
    assert.notEqual(kitchenId, engineId);

    const warehouse = urlFor("warehouse-picking-pov");
    const warehouseId = await recordedResourceId(await payWith(warehouse, (await buyer.requestUnpaid(warehouse)).paymentRequired, payload => {
      payload.resource = { url: "https://attacker.example/x", description: "", mimeType: "" };
    }));
    assert.equal(warehouseId, resourceIdFor(warehouse));
  } finally {
    server.close();
  }
});

test("a payment that edits extra.resourceId does not match and moves no funds", async () => {
  const { server, env } = await startServer({ X402_SETTLEMENT_CONTRACT: settlementContract });
  try {
    const url = `${env.resourceBaseUrl}/x402/datasets/kitchen-cooking-pov/content`;
    const { paymentRequired } = await new X402Buyer(env).requestUnpaid(url);
    const before = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
    const response = await payWith(url, paymentRequired, payload => {
      payload.accepted = { ...payload.accepted, extra: { ...payload.accepted.extra, resourceId: resourceIdFor(`${env.resourceBaseUrl}/x402/datasets/engine-assembly-pov/content`) } };
    });
    assert.equal(response.status, 402);
    const after = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
    assert.equal(after, before);
  } finally {
    server.close();
  }
});

test("a replayed x402 payment header is rejected without moving funds", async () => {
  const { server, env } = await startServer({});
  try {
    const buyer = new X402Buyer(env);
    const url = `${env.resourceBaseUrl}/x402/datasets/engine-assembly-pov/content`;
    const { paymentRequired } = await buyer.requestUnpaid(url);
    let header: Record<string, string> = {};
    const captured = new Promise<void>(resolve => {
      const original = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        if (headers["PAYMENT-SIGNATURE"]) { header = { "PAYMENT-SIGNATURE": headers["PAYMENT-SIGNATURE"] }; globalThis.fetch = original; resolve(); }
        return original(input, init);
      };
    });
    await buyer.payAndUnlock(url, paymentRequired, () => undefined, () => undefined);
    await captured;
    const before = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
    const replay = await fetch(url, { headers: { ...header, Accept: "application/json" } });
    assert.notEqual(replay.status, 200);
    const after = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] });
    assert.equal(after, before);
  } finally {
    server.close();
  }
});

test("preflight refuses a contract as X402_PAY_TO", async () => {
  const { server, env } = await startServer({ X402_PAY_TO: settlementContract, AGENT_ALLOWED_PAY_TO: settlementContract });
  try {
    await assert.rejects(new X402Buyer(env).preflight(), /X402_PAY_TO is a contract/);
  } finally {
    server.close();
  }
});
