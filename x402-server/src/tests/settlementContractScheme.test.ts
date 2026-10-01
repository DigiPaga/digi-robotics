import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentPayload, PaymentRequirements, SchemeNetworkFacilitator, VerifyResponse } from "@x402/core/types";
import type { FacilitatorEvmSigner } from "@x402/evm";
import { encodeAbiParameters, encodeEventTopics, type Hex, type Log } from "viem";
import { resourceIdFor, SettlementContractScheme, x402FacilitatorAbi } from "../x402/settlementContractScheme";

const CONTRACT = "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816";
const TOKEN = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";
const OPERATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PAYER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const PAYEE = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const NONCE = `0x${"ab".repeat(32)}` as Hex;
const TX = `0x${"11".repeat(32)}` as Hex;
const RESOURCE = "http://localhost:46123/x402/datasets/:id/content";

const requirements: PaymentRequirements = {
  scheme: "exact",
  network: "eip155:421614",
  asset: TOKEN,
  amount: "50000",
  payTo: PAYEE,
  maxTimeoutSeconds: 30,
  extra: { name: "Mock USDG (Demo)", version: "1" },
};

const payload: PaymentPayload = {
  x402Version: 2,
  resource: { url: RESOURCE, description: "", mimeType: "application/json" },
  accepted: requirements,
  payload: {
    signature: `0x${"22".repeat(65)}`,
    authorization: { from: PAYER, to: PAYEE, value: "50000", validAfter: "1", validBefore: "9999999999", nonce: NONCE },
  },
};

function settledLog(overrides: { amount?: bigint; nonce?: Hex } = {}): Log {
  const topics = encodeEventTopics({
    abi: x402FacilitatorAbi,
    eventName: "PaymentSettled",
    args: { resourceId: resourceIdFor(RESOURCE), payer: PAYER, payee: PAYEE },
  });
  const data = encodeAbiParameters(
    [{ type: "uint256" }, { type: "bytes32" }, { type: "address" }],
    [overrides.amount ?? 50_000n, overrides.nonce ?? NONCE, OPERATOR],
  );
  return { address: CONTRACT, topics, data, blockHash: null, blockNumber: null, logIndex: null, transactionHash: null, transactionIndex: null, removed: false } as unknown as Log;
}

interface FakeOptions {
  token?: string;
  isSettler?: boolean;
  status?: string;
  logs?: Log[];
  verify?: VerifyResponse;
}

function setup(options: FakeOptions = {}) {
  const writes: Array<{ functionName: string; args: readonly unknown[] }> = [];
  const signer = {
    getAddresses: () => [OPERATOR],
    readContract: async ({ functionName }: { functionName: string }) => functionName === "token" ? options.token ?? TOKEN : options.isSettler ?? true,
    verifyTypedData: async () => true,
    writeContract: async (args: { functionName: string; args: readonly unknown[] }) => { writes.push(args); return TX; },
    sendTransaction: async () => TX,
    waitForTransactionReceipt: async () => ({ status: options.status ?? "success", logs: options.logs ?? [settledLog()] }),
    getCode: async () => undefined,
  } as unknown as FacilitatorEvmSigner;
  const inner = {
    scheme: "exact",
    caipFamily: "eip155:*",
    getExtra: () => undefined,
    getSigners: () => [OPERATOR],
    verify: async () => options.verify ?? { isValid: true, payer: PAYER },
    settle: async () => { throw new Error("inner settle must not be used"); },
  } as SchemeNetworkFacilitator;
  return { scheme: new SettlementContractScheme(signer, CONTRACT, inner), writes };
}

test("settles through X402Facilitator.settle with the resource id and the signed authorization", async () => {
  const { scheme, writes } = setup();
  const result = await scheme.settle(payload, requirements);
  assert.deepEqual(result, { success: true, transaction: TX, network: "eip155:421614", payer: PAYER, amount: "50000" });
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.functionName, "settle");
  const [resourceId, auth, signature] = writes[0]!.args as [Hex, Record<string, unknown>, Hex];
  assert.equal(resourceId, resourceIdFor(RESOURCE));
  assert.deepEqual(auth, { from: PAYER, to: PAYEE, value: 50_000n, validAfter: 1n, validBefore: 9_999_999_999n, nonce: NONCE });
  assert.equal(signature, `0x${"22".repeat(65)}`);
});

test("does not submit when verification fails", async () => {
  const { scheme, writes } = setup({ verify: { isValid: false, invalidReason: "invalid_exact_evm_payload_signature", payer: PAYER } });
  const result = await scheme.settle(payload, requirements);
  assert.equal(result.success, false);
  assert.equal(result.errorReason, "invalid_exact_evm_payload_signature");
  assert.equal(writes.length, 0);
});

test("refuses a contract that settles a different token", async () => {
  const { scheme, writes } = setup({ token: PAYEE });
  const result = await scheme.settle(payload, requirements);
  assert.equal(result.errorReason, "settlement_contract_misconfigured");
  assert.equal(writes.length, 0);
});

test("refuses when the facilitator signer is not an approved settler", async () => {
  const { scheme, writes } = setup({ isSettler: false });
  const result = await scheme.settle(payload, requirements);
  assert.equal(result.errorReason, "settlement_contract_misconfigured");
  assert.match(result.errorMessage ?? "", /not an approved settler/);
  assert.equal(writes.length, 0);
});

test("rejects Permit2 payloads", async () => {
  const { scheme, writes } = setup();
  const permit2 = { ...payload, payload: { signature: "0x00", permit2Authorization: {} } };
  const result = await scheme.settle(permit2, requirements);
  assert.equal(result.errorReason, "unsupported_payload");
  assert.equal(writes.length, 0);
});

test("fails a reverted settlement", async () => {
  const { scheme } = setup({ status: "reverted" });
  const result = await scheme.settle(payload, requirements);
  assert.equal(result.success, false);
  assert.equal(result.errorReason, "transaction_reverted");
  assert.equal(result.transaction, TX);
});

test("fails when the receipt has no matching PaymentSettled event", async () => {
  for (const logs of [[], [settledLog({ amount: 1n })], [settledLog({ nonce: `0x${"cd".repeat(32)}` })]]) {
    const { scheme } = setup({ logs });
    const result = await scheme.settle(payload, requirements);
    assert.equal(result.errorReason, "settlement_event_missing");
  }
});
