import assert from "node:assert/strict";
import test from "node:test";
import { scoreCandidate, selectCandidate } from "../agent/discovery";
import { createPublicDatasets } from "../data/datasets";
import { testEnv } from "./fixtures";

test("deterministic scoring selects Engine Assembly POV", () => {
  const scored = createPublicDatasets(testEnv).map(item => scoreCandidate(item, "digirobotics", testEnv));
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const selected = selectCandidate(scored);
  assert.equal(selected.id, "engine-assembly-pov");
  assert.equal(selected.policyEligible, true);
  assert.ok(selected.reasons.includes("allowlisted seller"));
});
