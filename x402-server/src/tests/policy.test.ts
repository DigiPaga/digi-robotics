import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentRequirements } from "@x402/core/types";
import { displayAmountToAtomic, PolicyError, validatePaymentPolicy } from "../agent/policy";
import { TEST_ASSET, TEST_SELLER, testEnv } from "./fixtures";

const valid: PaymentRequirements = {
  scheme: "exact",
  network: "eip155:84532",
  asset: TEST_ASSET,
  amount: "50000",
  payTo: TEST_SELLER,
  maxTimeoutSeconds: 30,
  extra: { paymentFlow: "upfront", assetTransferMethod: "eip3009", name: "USDC", version: "2" },
};

test("display amount conversion uses verified decimals", () => assert.equal(displayAmountToAtomic("0.05", 6), 50_000n));
test("policy accepts the exact configured payment", () => assert.equal(validatePaymentPolicy(valid, "http://localhost:3001/x402/datasets/engine-assembly-pov/content", testEnv), valid));

for (const [name, patch] of [
  ["wrong network", { network: "eip155:421614" }],
  ["wrong asset", { asset: "0x39271d08C111912B1F32465745f3123a878C83Bb" }],
  ["unknown payTo", { payTo: "0xFd6F3e01c60870a8978665fF2EE872861590bEc3" }],
  ["amount over cap", { amount: "50001" }],
] as const) {
  test(`policy rejects ${name}`, () => assert.throws(() => validatePaymentPolicy({ ...valid, ...patch } as PaymentRequirements, "http://localhost:3001/x402/datasets/engine-assembly-pov/content", testEnv), PolicyError));
}

test("policy rejects unknown host", () => assert.throws(() => validatePaymentPolicy(valid, "https://evil.example/data", testEnv), PolicyError));
test("policy rejects a mismatched EIP-712 domain", () => assert.throws(() => validatePaymentPolicy({ ...valid, extra: { ...valid.extra, version: "1" } }, "http://localhost:3001/x402/datasets/engine-assembly-pov/content", testEnv), PolicyError));
