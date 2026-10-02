import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { RunStore } from "../agent/runStore";
import { createAgentDemoRouter } from "../routes/agentDemo";
import { testEnv } from "./fixtures";

function appWith(store: RunStore) {
  return express().use(createAgentDemoRouter(testEnv, store));
}

test("the event stream ends when its run fails instead of staying open until the run expires", async () => {
  const store = new RunStore(60_000, 1, 50_000n);
  const { run } = store.create("live", "REAL_X402_TEST_ASSET");
  setTimeout(() => store.fail(run.id, "CONFIGURATION_ERROR", "stopped"), 50);
  const response = await request(appWith(store)).get(`/agent-demo/runs/${run.id}/events`).timeout(5_000);
  assert.equal(response.status, 200);
  assert.match(response.text, /^id: 1\n/);
  assert.match(response.text, /id: 2\nevent: run\ndata: \{[^\n]*"state":"failed"/);
});

test("a finished run replays the events the client missed, then closes", async () => {
  const store = new RunStore(60_000, 1, 50_000n);
  const { run } = store.create("replay", "REAL_X402_TEST_ASSET");
  store.emit(run.id, "unlocked", "done");
  const response = await request(appWith(store)).get(`/agent-demo/runs/${run.id}/events`).set("Last-Event-ID", "1").timeout(5_000);
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /id: 1\n/);
  assert.match(response.text, /id: 2\nevent: run\n/);
});

test("reconnecting to a finished run with nothing missed returns 204 so EventSource stops", async () => {
  const store = new RunStore(60_000, 1, 50_000n);
  const { run } = store.create("done", "REAL_X402_TEST_ASSET");
  store.emit(run.id, "unlocked", "done");
  const response = await request(appWith(store)).get(`/agent-demo/runs/${run.id}/events`).set("Last-Event-ID", "2").timeout(5_000);
  assert.equal(response.status, 204);
});
