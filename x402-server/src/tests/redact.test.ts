import assert from "node:assert/strict";
import test from "node:test";
import { redactSecrets, safeErrorMessage } from "../utils/redact";

test("error and log serialization redact signing material", () => {
  const hex = `0x${"ab".repeat(32)}`;
  assert.deepEqual(redactSecrets({ privateKey: hex, nested: { authorization: "payload", safe: "ok" } }), {
    privateKey: "[REDACTED]",
    nested: { authorization: "[REDACTED]", safe: "ok" },
  });
  assert.equal(safeErrorMessage(new Error(`leaked ${hex}`)), "leaked [REDACTED]");
});
