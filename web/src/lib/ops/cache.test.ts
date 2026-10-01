// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsCache, memo } from "./cache";

beforeEach(() => clearOpsCache());

describe("memo", () => {
  it("serves a cached value until the ttl passes", async () => {
    let clock = 1_000;
    const now = () => clock;
    const load = vi.fn(async () => load.mock.calls.length);
    expect(await memo("k", 100, load, { now })).toBe(1);
    clock += 99;
    expect(await memo("k", 100, load, { now })).toBe(1);
    clock += 2;
    expect(await memo("k", 100, load, { now })).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one load between concurrent callers", async () => {
    let release!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => { release = resolve; }));
    const first = memo("k", 100, load);
    const second = memo("k", 100, load);
    release("v");
    expect(await Promise.all([first, second])).toEqual(["v", "v"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("bypasses the cached value when fresh is set and stores the new one", async () => {
    const load = vi.fn(async () => load.mock.calls.length);
    await memo("k", 10_000, load);
    expect(await memo("k", 10_000, load, { fresh: true })).toBe(2);
    expect(await memo("k", 10_000, load)).toBe(2);
  });

  it("does not cache a rejection", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(memo("k", 10_000, load)).rejects.toThrow("boom");
    expect(await memo("k", 10_000, load)).toBe("ok");
  });

  it("keeps keys apart", async () => {
    expect(await memo("a", 1_000, async () => "a")).toBe("a");
    expect(await memo("b", 1_000, async () => "b")).toBe("b");
  });
});
