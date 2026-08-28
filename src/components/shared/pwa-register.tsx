"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Service worker optional in unsupported browsers.
      }
    };
    if ("requestIdleCallback" in window) {
      const idle = window as Window & {
        requestIdleCallback: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback: (id: number) => void;
      };
      const id = idle.requestIdleCallback(() => {
        void register();
      }, { timeout: 4000 });
      return () => idle.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(() => {
      void register();
    }, 1500);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return null;
}
