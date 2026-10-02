import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthFlowProvider } from "@/components/auth/AuthFlowProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { Navbar } from "./Navbar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderNavbar() {
  return render(
    <CartProvider>
      <AuthFlowProvider>
        <Navbar />
      </AuthFlowProvider>
    </CartProvider>,
  );
}

describe("Navbar", () => {
  it("links to the agent demo from the desktop nav (DR-L-02)", () => {
    renderNavbar();
    expect(screen.getByRole("link", { name: "Agent demo" })).toHaveAttribute("href", "/agent-demo");
  });

  it("exposes orders on the desktop nav, not just the mobile drawer (DR-L-22)", () => {
    renderNavbar();
    expect(screen.getByRole("link", { name: "Your orders" })).toHaveAttribute("href", "/orders");
  });

  it("opens the mobile drawer as an accessible dialog with a scrollable container (DR-L-20, DR-L-29)", async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Site navigation" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.className).toMatch(/overflow-y-auto/);
    expect(dialog.className).not.toMatch(/min-h-dvh/);

    expect(within(dialog).getByRole("link", { name: /Agent demo/ })).toHaveAttribute("href", "/agent-demo");
  });
});
