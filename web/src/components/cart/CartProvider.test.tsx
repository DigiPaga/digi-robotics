import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CartProvider, useCart, type CartItem } from "./CartProvider";

const STORAGE_KEY = "digirobotics:cart:v1";

function Harness() {
  const cart = useCart();
  return (
    <div>
      <p data-testid="hydrated">{String(cart.isHydrated)}</p>
      <p data-testid="count">{cart.itemCount}</p>
      <p data-testid="total">{cart.total}</p>
      <ul>
        {cart.items.map((item) => (
          <li key={item.id} data-testid={`item-${item.id}`}>{item.name} x{item.quantity}</li>
        ))}
      </ul>
      <button onClick={() => cart.addItem({ id: "rover-1", name: "Rover", price: "19.99" })}>add-rover</button>
      <button onClick={() => cart.addItem({ id: "arm-1", name: "Arm", price: "5.00" })}>add-arm</button>
      <button onClick={() => cart.updateQuantity("rover-1", 3)}>set-rover-3</button>
      <button onClick={() => cart.updateQuantity("rover-1", 0)}>zero-rover</button>
      <button onClick={() => cart.updateQuantity("rover-1", 999)}>overflow-rover</button>
      <button onClick={() => cart.removeItem("arm-1")}>remove-arm</button>
      <button onClick={() => cart.clearCart()}>clear</button>
    </div>
  );
}

function renderCart() {
  return render(<CartProvider><Harness /></CartProvider>);
}

async function waitForHydration() {
  await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
}

afterEach(() => {
  window.localStorage.clear();
});

describe("CartProvider", () => {
  it("starts empty and hydrates from an empty localStorage", async () => {
    renderCart();
    await waitForHydration();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("total")).toHaveTextContent("0.00");
  });

  it("adds a new item and increments quantity on a repeat add", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-rover"));
    expect(screen.getByTestId("item-rover-1")).toHaveTextContent("Rover x1");

    await user.click(screen.getByText("add-rover"));
    expect(screen.getByTestId("item-rover-1")).toHaveTextContent("Rover x2");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("updates quantity directly and clamps to 99", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-rover"));
    await user.click(screen.getByText("set-rover-3"));
    expect(screen.getByTestId("item-rover-1")).toHaveTextContent("Rover x3");

    await user.click(screen.getByText("overflow-rover"));
    expect(screen.getByTestId("item-rover-1")).toHaveTextContent("Rover x99");
  });

  it("removes the item when quantity is set to zero", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-rover"));
    await user.click(screen.getByText("zero-rover"));
    expect(screen.queryByTestId("item-rover-1")).not.toBeInTheDocument();
  });

  it("removes an item explicitly via removeItem", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-arm"));
    expect(screen.getByTestId("item-arm-1")).toBeInTheDocument();
    await user.click(screen.getByText("remove-arm"));
    expect(screen.queryByTestId("item-arm-1")).not.toBeInTheDocument();
  });

  it("computes the total across multiple items with cent precision", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-rover")); // 19.99
    await user.click(screen.getByText("add-arm")); // 5.00
    expect(screen.getByTestId("total")).toHaveTextContent("24.99");
  });

  it("clears the cart", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-rover"));
    await user.click(screen.getByText("add-arm"));
    await user.click(screen.getByText("clear"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("persists items to localStorage after hydration", async () => {
    const user = userEvent.setup();
    renderCart();
    await waitForHydration();

    await user.click(screen.getByText("add-rover"));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CartItem[];
      expect(stored).toEqual([{ id: "rover-1", name: "Rover", price: "19.99", quantity: 1 }]);
    });
  });

  it("hydrates existing valid items from localStorage and drops malformed ones", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: "ok-1", name: "Valid", price: "9.50", quantity: 2 },
      { id: "bad-1", name: "Bad price", price: "9.5", quantity: 1 },
      { id: "bad-2", name: "Bad quantity", price: "9.50", quantity: 0 },
      { notAnItem: true },
    ]));

    renderCart();
    await waitForHydration();
    expect(screen.getByTestId("item-ok-1")).toHaveTextContent("Valid x2");
    expect(screen.queryByTestId("item-bad-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("item-bad-2")).not.toBeInTheDocument();
  });

  it("falls back to an empty cart when localStorage holds invalid JSON", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    renderCart();
    await waitForHydration();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("throws when useCart is used outside a CartProvider", () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => render(<Harness />)).toThrow("useCart must be used inside CartProvider");
    console.error = originalError;
  });
});
