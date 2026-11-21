import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./Reveal";

/**
 * Minimal `window.matchMedia` stub. framer-motion's `useReducedMotion` subscribes to
 * `(prefers-reduced-motion: reduce)` via `addEventListener`/`addListener` depending on
 * browser support; jsdom implements neither by default.
 */
function stubMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduce") ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("Reveal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // With prefers-reduced-motion: reduce, the home page used to stay permanently at
  // opacity:0 because `whileInView` was undefined and nothing else ever told framer-motion to
  // animate to the visible state.
  it("renders its content visibly when the user prefers reduced motion", async () => {
    stubMatchMedia(true);
    render(<Reveal>Hero copy</Reveal>);
    expect(await screen.findByText("Hero copy")).toBeVisible();
    const node = screen.getByText("Hero copy").parentElement as HTMLElement;
    expect(node.style.opacity).not.toBe("0");
  });

  it("still renders content when reduced motion is off, before any viewport animation", () => {
    stubMatchMedia(false);
    render(<Reveal>Hero copy</Reveal>);
    expect(screen.getByText("Hero copy")).toBeInTheDocument();
  });
});
