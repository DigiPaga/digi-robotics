import assert from "node:assert/strict";
import test from "node:test";
import { createPublicDatasets } from "../data/datasets";
import { protectedRegistryKeysForTest } from "../data/protectedDatasetContent";
import { testEnv } from "./fixtures";

test("public catalog contains three useful datasets without protected fields", () => {
  const datasets = createPublicDatasets(testEnv);
  assert.deepEqual(datasets.map(item => item.title), ["Engine Assembly POV", "Kitchen Cooking POV", "Warehouse Picking POV"]);
  for (const dataset of datasets) {
    const keys = Object.keys(dataset);
    assert.equal(keys.includes("cid"), false);
    assert.equal(keys.includes("signedUrl"), false);
    assert.equal(keys.includes("storageRef"), false);
  }
  assert.deepEqual(protectedRegistryKeysForTest(), datasets.map(item => item.id));
});
