import { describe, expect, it } from "vitest";
import { absoluteTime, formatAmount, formatDuration, formatInteger, relativeTime, shortAddress, shortHash } from "./format";

describe("ops formatting", () => {
  it("shortens addresses and hashes", () => {
    expect(shortAddress("0xd98aC3064B36dFb19b62558d48cB16f00105F473")).toBe("0xd98a…F473");
    expect(shortHash("0xd2d5a3851db8723f65c1c441d3fa83f468443f6860b1a1ab82efe002dd521d89")).toBe("0xd2d5a385…521d89");
    expect(shortAddress("0x12")).toBe("0x12");
  });

  it("formats amounts and integers, with n/a for missing values", () => {
    expect(formatAmount("0.050000")).toBe("0.05");
    expect(formatAmount("1234.5678", 2)).toBe("1,234.57");
    expect(formatAmount(null)).toBe("n/a");
    expect(formatInteger(314693208)).toBe("314,693,208");
    expect(formatInteger(null)).toBe("n/a");
  });

  it("formats relative time in both directions", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    expect(relativeTime("2026-10-01T11:59:58Z", now)).toBe("just now");
    expect(relativeTime("2026-10-01T11:59:30Z", now)).toBe("30s ago");
    expect(relativeTime("2026-10-01T11:15:00Z", now)).toBe("45m ago");
    expect(relativeTime("2026-10-01T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-09-28T12:00:00Z", now)).toBe("3d ago");
    expect(relativeTime("2026-10-01T12:20:00Z", now)).toBe("in 20m");
    expect(relativeTime(null, now)).toBe("n/a");
    expect(relativeTime("nonsense", now)).toBe("n/a");
  });

  it("formats durations and absolute times", () => {
    expect(formatDuration(7)).toBe("7s");
    expect(formatDuration(125)).toBe("2m 5s");
    expect(formatDuration(7_500)).toBe("2h 5m");
    expect(formatDuration(null)).toBe("n/a");
    expect(absoluteTime("2026-10-01T12:00:00.000Z")).toBe("2026-10-01 12:00:00 UTC");
    expect(absoluteTime("nope")).toBe("");
  });
});
