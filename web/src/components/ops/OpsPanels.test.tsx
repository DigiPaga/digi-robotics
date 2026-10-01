import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpsNotConfigured, OpsProblem, OpsSignIn } from "./OpsPanels";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/ops",
}));

describe("OpsSignIn", () => {
  it("shows the copy for a known error code", () => {
    render(<OpsSignIn error="denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("not on the ops allowlist");
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "unknown", ""])(
    "renders the sign-in screen with no alert for ?error=%s",
    (error) => {
      render(<OpsSignIn error={error} />);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute("href", "/ops/login");
    },
  );

  it("uses the console frame, with no navigation and no data", () => {
    const { container } = render(<OpsSignIn />);
    expect(container.querySelector("[data-ops-shell='gate']")).toHaveClass("ops-root");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to ops" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "ops-main");
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.textContent).not.toMatch(/0x[0-9a-fA-F]{6}/);
  });
});

describe("OpsNotConfigured", () => {
  it("shows a generic message without naming any env variable", () => {
    const { container } = render(<OpsNotConfigured />);
    expect(screen.getByRole("heading", { name: "Ops is not configured." })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/GOOGLE_|OPS_|SECRET|ALLOWED|env/i);
    expect(container.querySelector("li")).toBeNull();
  });

  it("uses the same frame as sign-in and offers no way in", () => {
    const { container } = render(<OpsNotConfigured />);
    expect(container.querySelector("[data-ops-shell='gate']")).toHaveClass("ops-root");
    expect(screen.queryByRole("link", { name: /google/i })).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("OpsProblem", () => {
  it("renders a title, a message and an optional action", () => {
    render(<OpsProblem title="This section failed to render" action={<button type="button">Try again</button>}>Something went wrong while drawing this section.</OpsProblem>);
    expect(screen.getByRole("heading", { level: 1, name: "This section failed to render" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
