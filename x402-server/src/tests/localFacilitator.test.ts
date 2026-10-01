import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { createLocalFacilitator } from "../x402/localFacilitator";
import { testEnv } from "./fixtures";

// Well-known Anvil development key; it holds no value on any public network.
const FACILITATOR_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

const musdgEnv = {
  ...testEnv,
  mode: "REAL_MUSDG_X402",
  network: "eip155:421614",
  chainId: 421_614,
  rpcUrl: "http://127.0.0.1:1",
  facilitatorPrivateKey: FACILITATOR_KEY,
} as const;

test("local facilitator advertises x402 v2 exact on the configured network with its own signer", async () => {
  const supported = await createLocalFacilitator(musdgEnv).getSupported();
  assert.deepEqual(supported.kinds.map(kind => [kind.x402Version, kind.scheme, kind.network]), [[2, "exact", "eip155:421614"]]);
  const signers = Object.values(supported.signers).flat();
  assert.deepEqual(signers, [privateKeyToAccount(FACILITATOR_KEY).address]);
});

test("local facilitator refuses to start without a facilitator key", () => {
  assert.throws(() => createLocalFacilitator({ ...musdgEnv, facilitatorPrivateKey: undefined }), /X402_FACILITATOR_PRIVATE_KEY/);
});
