// @vitest-environment node
//
// This module imports the "server-only" package, which throws when evaluated
// in an environment that defines `window` (jsdom). Running this file under
// vitest's plain "node" environment avoids that guard, same as it would run
// as a real Next.js server module.
import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeToKit } from "./kit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("subscribeToKit", () => {
  it("rejects with KIT_NOT_CONFIGURED when the API key or form id is missing", async () => {
    vi.stubEnv("KIT_API_KEY", "");
    vi.stubEnv("KIT_FORM_ID", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(subscribeToKit({ email: "a@example.com", source: "newsletter" })).rejects.toThrow("KIT_NOT_CONFIGURED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects with KIT_NOT_CONFIGURED when only one of the two vars is set", async () => {
    vi.stubEnv("KIT_API_KEY", "key_123");
    vi.stubEnv("KIT_FORM_ID", "");
    await expect(subscribeToKit({ email: "a@example.com", source: "gear_waitlist" })).rejects.toThrow("KIT_NOT_CONFIGURED");
  });
});
