"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  productIds: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),
      has: (productId) => get().productIds.includes(productId),
    }),
    { name: "lorvex-wishlist" },
  ),
);

type CompareState = {
  productIds: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) =>
        set((state) => {
          if (state.productIds.includes(productId)) {
            return {
              productIds: state.productIds.filter((id) => id !== productId),
            };
          }
          if (state.productIds.length >= 4) return state;
          return { productIds: [...state.productIds, productId] };
        }),
      has: (productId) => get().productIds.includes(productId),
      clear: () => set({ productIds: [] }),
    }),
    { name: "lorvex-compare" },
  ),
);

type RecentlyViewedState = {
  productIds: string[];
  push: (productId: string) => void;
};

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      productIds: [],
      push: (productId) =>
        set((state) => ({
          productIds: [
            productId,
            ...state.productIds.filter((id) => id !== productId),
          ].slice(0, 12),
        })),
    }),
    { name: "lorvex-recent" },
  ),
);
