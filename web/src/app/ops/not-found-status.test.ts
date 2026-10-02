// @vitest-environment node
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { notFound } from "next/navigation";
import CatchAll from "./(console)/[...rest]/page";

const appDir = path.resolve(__dirname, "..");
const catchAllDir = path.join(__dirname, "(console)", "[...rest]");

/** Every segment directory from src/app down to the catch-all route. */
function ancestorsOfCatchAll(): string[] {
  const dirs: string[] = [];
  for (let dir = catchAllDir; dir.startsWith(appDir); dir = path.dirname(dir)) dirs.push(dir);
  return dirs;
}

describe("unknown /ops sections", () => {
  it("throw notFound() from the catch-all page", () => {
    let thrown: unknown;
    try {
      CatchAll();
    } catch (error) {
      thrown = error;
    }
    let expected: unknown;
    try {
      notFound();
    } catch (error) {
      expected = error;
    }
    expect((thrown as { digest?: string }).digest).toBe((expected as { digest?: string }).digest);
  });

  it("have no loading boundary above them, so the 404 status is set before anything streams", () => {
    // A loading.tsx is a Suspense fallback: once it renders, headers are sent with a 200
    // and the later notFound() can only swap the body. See next/dist/docs loading.md, "Status Codes".
    const withLoading = ancestorsOfCatchAll().filter((dir) => existsSync(path.join(dir, "loading.tsx")));
    expect(withLoading.map((dir) => path.relative(appDir, dir))).toEqual([]);
  });

  it("still render the console's own not-found screen", () => {
    expect(existsSync(path.join(__dirname, "(console)", "not-found.tsx"))).toBe(true);
  });
});
