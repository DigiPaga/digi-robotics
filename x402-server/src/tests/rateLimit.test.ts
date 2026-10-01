import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentPayload } from "@x402/core/types";
import { createPaidRouteRateLimit, type PaidRouteRateLimit } from "../x402/rateLimit";
import { loadEnv } from "../config/env";

const PAYER_A = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const PAYER_B = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const TREASURY = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

function paymentHeader(from: string): Record<string, string> {
  const payload = {
    x402Version: 2,
    resource: { url: "http://localhost/x402/datasets/engine-assembly-pov/content", description: "", mimeType: "" },
    accepted: { scheme: "exact", network: "eip155:421614", asset: TREASURY, amount: "50000", payTo: TREASURY, maxTimeoutSeconds: 30, extra: {} },
    payload: { signature: "0x00", authorization: { from, to: TREASURY, value: "50000", validAfter: "0", validBefore: "1", nonce: `0x${"00".repeat(32)}` } },
  } as PaymentPayload;
  return { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) };
}

function app(config: PaidRouteRateLimit, clock: { now: number }) {
  const server = express();
  server.get("/paid", createPaidRouteRateLimit(config, () => clock.now), (_req, res) => res.json({ ok: true }));
  return server;
}

test("limits requests per client IP and resets after the window", async () => {
  const clock = { now: 1_000_000 };
  const server = app({ windowMs: 60_000, perIp: 2, perPayer: 0 }, clock);
  assert.equal((await request(server).get("/paid")).status, 200);
  assert.equal((await request(server).get("/paid")).status, 200);
  const limited = await request(server).get("/paid");
  assert.equal(limited.status, 429);
  assert.equal(limited.body.scope, "ip");
  assert.equal(limited.headers["retry-after"], "60");

  clock.now += 60_000;
  assert.equal((await request(server).get("/paid")).status, 200);
});

test("limits payment attempts per payer independently of other payers", async () => {
  const clock = { now: 1_000_000 };
  const server = app({ windowMs: 10_000, perIp: 0, perPayer: 1 }, clock);
  assert.equal((await request(server).get("/paid").set(paymentHeader(PAYER_A))).status, 200);
  const limited = await request(server).get("/paid").set(paymentHeader(PAYER_A.toLowerCase()));
  assert.equal(limited.status, 429);
  assert.equal(limited.body.scope, "payer");
  assert.equal((await request(server).get("/paid").set(paymentHeader(PAYER_B))).status, 200);
  // Unpaid requests and undecodable headers are not attributed to a payer.
  assert.equal((await request(server).get("/paid")).status, 200);
  assert.equal((await request(server).get("/paid").set("PAYMENT-SIGNATURE", "not-base64-json")).status, 200);

  clock.now += 10_000;
  assert.equal((await request(server).get("/paid").set(paymentHeader(PAYER_A))).status, 200);
});

test("rate limit settings come from the environment with safe defaults", () => {
  const base = { X402_PAY_TO: TREASURY, AGENT_ALLOWED_PAY_TO: TREASURY, X402_MODE: "BLOCKED" } as NodeJS.ProcessEnv;
  assert.deepEqual(loadEnv(base).paidRouteRateLimit, { windowMs: 60_000, perIp: 60, perPayer: 10 });
  assert.deepEqual(
    loadEnv({ ...base, X402_RATE_LIMIT_WINDOW_MS: "5000", X402_RATE_LIMIT_PER_IP: "0", X402_RATE_LIMIT_PER_PAYER: "3" }).paidRouteRateLimit,
    { windowMs: 5_000, perIp: 0, perPayer: 3 },
  );
  assert.throws(() => loadEnv({ ...base, X402_RATE_LIMIT_PER_IP: "-1" }), /X402_RATE_LIMIT_PER_IP/);
});
