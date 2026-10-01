import { describe, expect, it } from "vitest";
import { OPS_SECTIONS, sectionForKey, sectionForPath } from "./sections";

describe("ops sections", () => {
  it("gives every section a unique route, endpoint and shortcut", () => {
    for (const field of ["id", "href", "api", "key"] as const) {
      expect(new Set(OPS_SECTIONS.map((section) => section[field])).size).toBe(OPS_SECTIONS.length);
    }
    for (const section of OPS_SECTIONS) {
      expect(section.href).toMatch(/^\/ops(\/[a-z]+)?$/);
      expect(section.api).toMatch(/^\/api\/ops\/[a-z]+$/);
      expect(section.key).toMatch(/^[a-z]$/);
    }
  });

  it("resolves a pathname to its section", () => {
    expect(sectionForPath("/ops")?.id).toBe("overview");
    expect(sectionForPath("/ops/")?.id).toBe("overview");
    expect(sectionForPath("/ops/payments")?.id).toBe("payments");
    expect(sectionForPath("/ops/contracts/anything")?.id).toBe("contracts");
    expect(sectionForPath("/ops/unknown")).toBeNull();
    expect(sectionForPath("/opsx")).toBeNull();
    expect(sectionForPath("/ops/walletsx")).toBeNull();
    expect(sectionForPath(null)).toBeNull();
  });

  it("resolves a shortcut key, case-insensitively", () => {
    expect(sectionForKey("w")?.id).toBe("wallets");
    expect(sectionForKey("I")?.id).toBe("infra");
    expect(sectionForKey("x")).toBeNull();
  });
});
