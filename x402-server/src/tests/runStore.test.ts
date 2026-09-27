import assert from "node:assert/strict";
import test from "node:test";
import { RunStore } from "../agent/runStore";

test("idempotency returns the same run and payment can only be claimed once", () => {
  const store = new RunStore(60_000, 3, 50_000n);
  const first = store.create("same-key", "REAL_X402_TEST_ASSET");
  const second = store.create("same-key", "REAL_X402_TEST_ASSET");
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.run.id, first.run.id);
  assert.equal(store.claimPayment(first.run.id, 50_000n), true);
  assert.equal(store.claimPayment(first.run.id, 50_000n), false);
});

test("process-wide budget prevents sequential runs from draining the signer", () => {
  const store = new RunStore(60_000, 2, 50_000n);
  const first = store.create("first", "REAL_X402_TEST_ASSET").run;
  const second = store.create("second", "REAL_X402_TEST_ASSET").run;
  assert.equal(store.claimPayment(first.id, 50_000n), true);
  assert.equal(store.claimPayment(second.id, 50_000n), false);
});
