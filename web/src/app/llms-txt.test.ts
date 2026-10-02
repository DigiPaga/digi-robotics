// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Next.js and the OpenNext Worker serve web/public/* from the site root, so this file
// is what https://digirobotics.xyz/llms.txt returns.
const webDir = path.resolve(__dirname, "..", "..");
const servedFile = path.join(webDir, "public", "llms.txt");

describe("/llms.txt", () => {
  it("is served from web/public", () => {
    expect(existsSync(servedFile)).toBe(true);
    expect(readFileSync(servedFile, "utf8")).toMatch(/^# DigiRobotics/);
  });

  it("has a single source of truth", () => {
    expect(existsSync(path.join(webDir, "..", "llms.txt"))).toBe(false);
  });

  it("is listed in robots.txt", () => {
    expect(readFileSync(path.join(webDir, "public", "robots.txt"), "utf8")).toMatch(/^Allow: \/llms\.txt$/m);
  });
});
