import assert from "node:assert/strict";
import test from "node:test";
import { BuyerError, X402Buyer } from "../agent/x402Buyer";
import { testEnv } from "./fixtures";

// Well-known Anvil development key; it holds no value on any public network.
const env = { ...testEnv, privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const };
const resource = `${env.resourceBaseUrl}/x402/datasets/engine-assembly-pov/content`;

/** A fetch that records its calls and answers 500, which requestUnpaid reports by status. */
function recordingFetch(calls: string[]): typeof fetch {
  return async input => {
    calls.push(String(input));
    return new Response("{}", { status: 500 });
  };
}

test("buyer without an injected fetch uses the global fetch as it is at request time", async () => {
  const buyer = new X402Buyer(env);
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = recordingFetch(calls);
  try {
    await assert.rejects(buyer.requestUnpaid(resource), (error: unknown) => error instanceof BuyerError && /received 500/.test(error.message));
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(calls, [resource]);
});

test("buyer uses an injected fetch instead of the global one", async () => {
  const injected: string[] = [];
  const global: string[] = [];
  const buyer = new X402Buyer(env, recordingFetch(injected));
  const original = globalThis.fetch;
  globalThis.fetch = recordingFetch(global);
  try {
    await assert.rejects(buyer.requestUnpaid(resource), /received 500/);
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(injected, [resource]);
  assert.deepEqual(global, []);
});
