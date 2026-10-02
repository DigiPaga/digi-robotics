import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { MarketplaceSection } from "./MarketplaceSection";

// jsdom has no IntersectionObserver; Reveal's framer-motion whileInView needs one to mount.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  // @ts-expect-error -- test-only stub, not a spec-complete IntersectionObserver
  window.IntersectionObserver = MockIntersectionObserver;
});

describe("MarketplaceSection", () => {
  it("uses one honest CTA label for every card, all pointing to the custom-data form (DR-C-15)", () => {
    render(<MarketplaceSection />);
    const ctas = screen.getAllByRole("link", { name: /REQUEST ACCESS/ });
    expect(ctas).toHaveLength(9);
    for (const cta of ctas) expect(cta).toHaveAttribute("href", "#custom-data");
  });

  it("gives every dataset card the same icon-based treatment (DR-L-24)", () => {
    const { container } = render(<MarketplaceSection />);
    const povLabels = screen.getAllByText(/^POV \//);
    expect(povLabels).toHaveLength(9);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
