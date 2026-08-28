"use client";

import { create } from "zustand";

type LuxuryUiState = {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  loadingComplete: boolean;
  setLoadingComplete: (complete: boolean) => void;
};

export const useLuxuryUiStore = create<LuxuryUiState>((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  loadingComplete: true,
  setLoadingComplete: (complete) => set({ loadingComplete: complete }),
}));
