import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("does not render separate Privacy and Terms links to the same anchor (DR-L-27)", () => {
    render(<Footer />);
    expect(screen.queryByRole("link", { name: "Privacy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Terms" })).not.toBeInTheDocument();
    const combined = screen.getByRole("link", { name: "Privacy & Terms" });
    expect(combined).toHaveAttribute("href", "/#privacy-note");
  });

  it("links to the agent demo for extra discoverability (DR-L-02)", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Agent Demo" })).toHaveAttribute("href", "/agent-demo");
  });
});
