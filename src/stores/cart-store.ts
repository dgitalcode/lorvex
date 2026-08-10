"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantName: string;
  imageUrl: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number;
};

type CartState = {
  items: CartLine[];
  addItem: (item: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            (line) => line.variantId === item.variantId,
          );
          if (existing) {
            return {
              items: state.items.map((line) =>
                line.variantId === item.variantId
                  ? {
                      ...line,
                      quantity: Math.min(
                        line.stock,
                        line.quantity + quantity,
                      ),
                    }
                  : line,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(item.stock, quantity) },
            ],
          };
        });
      },
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((line) => line.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((line) =>
              line.variantId === variantId
                ? {
                    ...line,
                    quantity: Math.max(1, Math.min(line.stock, quantity)),
                  }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, line) => sum + line.price * line.quantity, 0),
    }),
    { name: "lorvex-cart" },
  ),
);
