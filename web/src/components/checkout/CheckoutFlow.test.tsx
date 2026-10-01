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

describe("CheckoutFlow without a Thirdweb client id", () => {
  it("imports cleanly and reports thirdweb as unconfigured instead of crashing /checkout", async () => {
    const original = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    vi.resetModules();
    try {
      const flow = await import("./CheckoutFlow");
      expect(typeof flow.CheckoutFlow).toBe("function");
      const thirdweb = await import("@/lib/thirdweb");
      expect(thirdweb.isThirdwebConfigured).toBe(false);
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

  it("advances to step 3 on valid shipping input with mUSDG ready and payment gated on a wallet", async () => {
    // Arbitrum Sepolia is configured with MockUSDG, so step 3 is not paused; with no
    // connected wallet the pay button stays disabled.
    seedCart([{ id: "rover-1", name: "Scout Rover", price: "19.99", quantity: 1 }]);
    const user = userEvent.setup();
    renderCheckout();
    await waitForHydrated();

    await user.click(screen.getByText("Continue to shipping"));
    await user.type(screen.getByPlaceholderText("Ada Lovelace"), "Ada Lovelace");
    await user.type(screen.getByPlaceholderText("Street, city, postal code, country"), "1 Robotics Way, Singapore");
    await user.type(screen.getByPlaceholderText("+65 5555 0100"), "+65 5555 0100");
    await user.click(screen.getByText("Continue to wallet"));

    expect(screen.getByText("Pay with mUSDG")).toBeInTheDocument();
    expect(screen.queryByText(/Checkout is safely paused/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay 19.99 mUSDG" })).toBeDisabled();

    const stepper = screen.getByLabelText("Checkout progress");
    const walletStep = within(stepper).getAllByRole("listitem").find((item) => item.textContent?.includes("Wallet"));
    expect(walletStep).toHaveAttribute("aria-current", "step");
  });
});
