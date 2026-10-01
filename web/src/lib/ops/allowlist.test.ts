import { describe, expect, it } from "vitest";
import { canonicalizeEmail, isAllowedEmail, parseAllowlist } from "./allowlist";

describe("ops allowlist", () => {
  it("canonicalizes case, whitespace and gmail dots", () => {
    expect(canonicalizeEmail("  OttoDevs@Gmail.com ")).toBe("ottodevs@gmail.com");
    expect(canonicalizeEmail("otto.devs@googlemail.com")).toBe("ottodevs@gmail.com");
    expect(canonicalizeEmail("first.last@example.com")).toBe("first.last@example.com");
    expect(canonicalizeEmail("me+ops@gmail.com")).toBe("me+ops@gmail.com");
    expect(canonicalizeEmail("not-an-email")).toBe("");
    expect(canonicalizeEmail("@gmail.com")).toBe("");
    expect(canonicalizeEmail("x@")).toBe("");
  });

  it("parses a comma list and matches canonical forms", () => {
    const list = parseAllowlist("OttoDevs@gmail.com, oscar@digipaga.xyz ,,");
    expect(list.size).toBe(2);
    expect(isAllowedEmail("otto.devs@gmail.com", list)).toBe(true);
    expect(isAllowedEmail("OSCAR@digipaga.xyz", list)).toBe(true);
    expect(isAllowedEmail("ottodevs+x@gmail.com", list)).toBe(false);
    expect(isAllowedEmail("intruder@gmail.com", list)).toBe(false);
  });

  it("denies everyone when the allowlist is unset or empty", () => {
    for (const raw of [undefined, "", "  ", ",", "garbage"]) {
      const list = parseAllowlist(raw);
      expect(isAllowedEmail("ottodevs@gmail.com", list)).toBe(false);
      expect(isAllowedEmail("", list)).toBe(false);
    }
  });
});
