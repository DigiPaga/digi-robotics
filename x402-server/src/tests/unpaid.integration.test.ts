import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import type { FacilitatorClient } from "@x402/core/server";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { createProtectedDatasetMiddleware } from "../x402/resourceServer";
import { TEST_ASSET, TEST_SELLER, testEnv } from "./fixtures";

const facilitator: FacilitatorClient = {
  async getSupported() {
    return { kinds: [{ x402Version: 2, scheme: "exact", network: testEnv.network }], extensions: ["bazaar"], signers: { "eip155:*": [TEST_SELLER] } };
  },
  async verify() { throw new Error("verify must not run for an unpaid request"); },
  async settle() { throw new Error("settle must not run for an unpaid request"); },
};

test("unpaid protected resource returns genuine machine-readable x402 v2 requirements", async () => {
  const app = express();
  app.use(createProtectedDatasetMiddleware(testEnv, facilitator));
  app.get("/x402/datasets/:id/content", (_req, res) => res.json({ forbidden: "protected" }));
  const response = await request(app).get("/x402/datasets/engine-assembly-pov/content").set("Accept", "application/json");
  assert.equal(response.status, 402);
  assert.equal(response.body.error, "PAYMENT_REQUIRED");
  assert.equal(JSON.stringify(response.body).includes("storageRef"), false);
  const header = response.headers["payment-required"];
  assert.equal(typeof header, "string");
  const decoded = decodePaymentRequiredHeader(header);
  assert.equal(decoded.x402Version, 2);
  assert.equal(decoded.accepts[0]?.network, testEnv.network);
  assert.equal(decoded.accepts[0]?.asset, TEST_ASSET);
  assert.equal(decoded.accepts[0]?.amount, "50000");
  assert.equal(decoded.accepts[0]?.payTo, TEST_SELLER);
});
