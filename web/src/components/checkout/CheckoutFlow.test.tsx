import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "@/components/cart/CartProvider";
import { CheckoutFlow } from "./CheckoutFlow";

const STORAGE_KEY = "digirobotics:cart:v1";

// CheckoutFlow pulls in thirdweb/react hooks, the AuthButton (which needs an
// AuthFlowProvider context), and the stablecoinPayment wallet/network module.
// None of those are exercised by the scenarios below (cart, shipping, and the
// asset-not-ready banner that gates step 3 before any wallet call happens), so
// they are stubbed out to keep these tests deterministic and network-free.
vi.mock("thirdweb/react", () => ({
  useActiveAccount: vi.fn(() => undefined),
  useActiveWalletChain: vi.fn(() => undefined),
  useActiveWalletConnectionStatus: vi.fn(() => "unknown" as const),
  useSwitchActiveWalletChain: vi.fn(() => vi.fn()),
}));

vi.mock("@/components/auth/AuthButton", () => ({
  AuthButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/lib/stablecoinPayment", () => ({
  getStablecoinWallet: vi.fn(),
  fundDemoWallet: vi.fn(),
  executeStablecoinPayment: vi.fn(),
  confirmStablecoinTransaction: vi.fn(),
}));

vi.mock("@/lib/toasts", () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn(),
  showTransactionConfirmed: vi.fn(),
  showTransactionPending: vi.fn(),
  showTransactionSubmitted: vi.fn(),
}));

function seedCart(items: Array<{ id: string; name: string; price: string; quantity: number }>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderCheckout() {
  return render(<CartProvider><CheckoutFlow /></CartProvider>);
}

async function waitForHydrated() {
  // CheckoutFlow shows CheckoutLoadingState (role="status", "Loading cart") until
  // CartProvider finishes its requestAnimationFrame hydration.
  await waitFor(() => expect(screen.queryByLabelText("Loading cart")).not.toBeInTheDocument());
}

afterEach(() => {
  window.localStorage.clear();
});

describe("CheckoutFlow import guard (documents a real bug on main)", () => {
  it("throws at import time when NEXT_PUBLIC_THIRDWEB_CLIENT_ID is unset, matching the live /checkout 500", async () => {
    // lib/thirdweb.ts calls createThirdwebClient({ clientId }) unconditionally at
    // module scope. With no clientId and no secretKey it throws synchronously, so
    // merely importing CheckoutFlow.tsx (which imports thirdweb.ts) crashes - this
    // is exactly why GET /checkout 500s on main whenever the env var is unset. The
    // fix lives on a separate branch (fix/checkout-missing-env), not on main.
    const original = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    vi.resetModules();
    try {
      await expect(import("./CheckoutFlow")).rejects.toThrow(/clientId|secretKey/i);
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
      else process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = original;
      vi.resetModules();
    }
  });
});

describe("CheckoutFlow", () => {
  it("renders the empty-cart state when there are no items", async () => {
    renderCheckout();
    await waitForHydrated();
    expect(screen.getByText("Start with the gear catalog.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse gear" })).toBeInTheDocument();
  });

  it("renders cart items in step 1 and wires quantity controls to the cart", async () => {
    seedCart([{ id: "rover-1", name: "Scout Rover", price: "19.99", quantity: 1 }]);
    const user = userEvent.setup();
    renderCheckout();
    await waitForHydrated();

    expect(screen.getByText("Scout Rover")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Increase Scout Rover quantity"));
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Remove Scout Rover"));
    expect(screen.getByText("Start with the gear catalog.")).toBeInTheDocument();
  });

  it("shows zod validation errors on an empty shipping form and blocks advancing", async () => {
    seedCart([{ id: "rover-1", name: "Scout Rover", price: "19.99", quantity: 1 }]);
    const user = userEvent.setup();
    renderCheckout();
    await waitForHydrated();

    await user.click(screen.getByText("Continue to shipping"));
    expect(screen.getByText("Where would this order go?")).toBeInTheDocument();

    await user.click(screen.getByText("Continue to wallet"));
    expect(screen.getByText("Enter the recipient’s full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a complete delivery address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid phone number.")).toBeInTheDocument();
    // Still on step 2.
    expect(screen.getByText("Where would this order go?")).toBeInTheDocument();
  });

  it("advances to step 3 on valid shipping input, which is paused by the unready checkout asset", async () => {
    // getStablecoinConfig(421614).symbol is "USDC" (web/src/lib/stablecoinConfig.ts),
    // which isUsdGCompatibleSymbol() rejects - so step 3 always renders the paused
    // banner on main's current config, regardless of wallet connection state. This
    // is real, current behavior, not a mock artifact.
    seedCart([{ id: "rover-1", name: "Scout Rover", price: "19.99", quantity: 1 }]);
    const user = userEvent.setup();
    renderCheckout();
    await waitForHydrated();

    await user.click(screen.getByText("Continue to shipping"));
    await user.type(screen.getByPlaceholderText("Ada Lovelace"), "Ada Lovelace");
    await user.type(screen.getByPlaceholderText("Street, city, postal code, country"), "1 Robotics Way, Singapore");
    await user.type(screen.getByPlaceholderText("+65 5555 0100"), "+65 5555 0100");
    await user.click(screen.getByText("Continue to wallet"));

    expect(screen.getByText("Pay with USDG-compatible test asset")).toBeInTheDocument();
    const banner = screen.getByRole("alert");
    expect(within(banner).getByText(/Checkout is safely paused/)).toBeInTheDocument();

    const stepper = screen.getByLabelText("Checkout progress");
    const walletStep = within(stepper).getAllByRole("listitem").find((item) => item.textContent?.includes("Wallet"));
    expect(walletStep).toHaveAttribute("aria-current", "step");
  });
});
