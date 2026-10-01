import { afterEach, describe, expect, it, vi } from "vitest";
import { getCompatibility, toAgentLifecycleState } from "./agent-demo-client";

describe("toAgentLifecycleState", () => {
  it("defaults to idle when no state is given", () => {
    expect(toAgentLifecycleState(undefined)).toBe("idle");
  });

  it("groups the discovery states", () => {
    for (const state of ["queued", "preflight", "searching", "candidates_found"] as const) {
      expect(toAgentLifecycleState(state)).toBe("discovering");
    }
  });

  it("groups the dataset-selected states", () => {
    for (const state of ["selected", "requesting_resource"] as const) {
      expect(toAgentLifecycleState(state)).toBe("dataset_selected");
    }
  });

  it("maps payment_required directly", () => {
    expect(toAgentLifecycleState("payment_required")).toBe("payment_required");
  });

  it("groups the authorizing states", () => {
    for (const state of ["validating_policy", "signing_payment", "retrying_request"] as const) {
      expect(toAgentLifecycleState(state)).toBe("authorizing");
    }
  });

  it("maps verifying to settling", () => {
    expect(toAgentLifecycleState("verifying")).toBe("settling");
  });

  it("maps settling to confirming", () => {
    expect(toAgentLifecycleState("settling")).toBe("confirming");
  });

  it("passes through terminal states", () => {
    expect(toAgentLifecycleState("unlocked")).toBe("unlocked");
    expect(toAgentLifecycleState("failed")).toBe("failed");
  });
});

describe("getCompatibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed body on a successful response", async () => {
    const body = { selectedMode: "BLOCKED" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    }));
    await expect(getCompatibility()).resolves.toEqual(body);
  });

  it("throws a typed error with the server-provided code on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ code: "RPC_UNAVAILABLE", message: "backend is down" }),
    }));
    await expect(getCompatibility()).rejects.toMatchObject({ code: "RPC_UNAVAILABLE", status: 503, message: "backend is down" });
  });

  it("derives a fallback error code from the http status when the body has none", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }));
    await expect(getCompatibility()).rejects.toMatchObject({ code: "RPC_UNAVAILABLE", status: 500 });
  });

  it("uses an HTTP_<status> fallback code for non-5xx failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    }));
    await expect(getCompatibility()).rejects.toMatchObject({ code: "HTTP_404", status: 404 });
  });

  it("tolerates an unparsable error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    }));
    await expect(getCompatibility()).rejects.toMatchObject({ code: "RPC_UNAVAILABLE" });
  });
});
