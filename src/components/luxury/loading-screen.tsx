"use client";

import { useEffect } from "react";
import { useLuxuryUiStore } from "@/stores/luxury-ui-store";

/**
 * First-visit overlay delayed LCP by ~1.8s. Mark loading complete immediately
 * so the real hero/product image can be the LCP candidate.
 */
export function LoadingScreen() {
  const setLoadingComplete = useLuxuryUiStore((s) => s.setLoadingComplete);

  useEffect(() => {
    setLoadingComplete(true);
  }, [setLoadingComplete]);

  return null;
}
