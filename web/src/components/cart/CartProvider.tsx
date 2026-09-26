"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CartItem = { id: string; name: string; price: string; quantity: number };

type CartValue = {
  items: CartItem[];
  itemCount: number;
  total: string;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "digirobotics:cart:v1";
const CartContext = createContext<CartValue | null>(null);

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CartItem =>
      typeof item?.id === "string" && typeof item?.name === "string" &&
      /^\d+\.\d{2}$/.test(item?.price) && Number.isInteger(item?.quantity) && item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(loadCart());
      hydrated.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (hydrated.current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      return existing
        ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: Math.min(99, entry.quantity + 1) } : entry)
        : [...current, { ...item, quantity: 1 }];
    });
  }, []);
  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) return setItems((current) => current.filter((item) => item.id !== id));
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.min(99, Math.floor(quantity)) } : item));
  }, []);
  const removeItem = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: (items.reduce((sum, item) => sum + Math.round(Number(item.price) * 1_000_000) * item.quantity, 0) / 1_000_000).toFixed(2),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [items, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
