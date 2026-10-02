import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AuthFlowProvider } from "@/components/auth/AuthFlowProvider";
import { HeroSection } from "./HeroSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

function renderHero() {
  return render(
    <AuthFlowProvider>
      <HeroSection />
    </AuthFlowProvider>,
  );
}

describe("HeroSection", () => {
  it("states the testnet disclosure as plain text, not a link", () => {
    renderHero();
    const disclosure = screen.getByText(/Arbitrum Sepolia \+ Robinhood Chain Testnet/);
    expect(disclosure.tagName).toBe("P");
    expect(disclosure.closest("a")).toBeNull();
  });

  it("gives the agent demo its own distinct, clickable link with the label and arrow adjacent", () => {
    renderHero();
    const link = screen.getByRole("link", { name: /Watch the agent demo/ });
    expect(link).toHaveAttribute("href", "/agent-demo");
    expect(link.className).toMatch(/min-h-11/);
  });

  it("keeps the two primary hero CTAs intact alongside the agent demo link", () => {
    renderHero();
    expect(screen.getByRole("button", { name: /Become a contributor/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Request custom data/ })).toHaveAttribute("href", "#custom-data");
    expect(screen.getByRole("link", { name: /Watch the agent demo/ })).toHaveAttribute("href", "/agent-demo");
  });
});
