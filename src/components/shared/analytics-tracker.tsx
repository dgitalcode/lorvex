"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "lorvex_analytics_session";

function getSessionId() {
  if (typeof window === "undefined") return null;
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function track(event: {
  name: string;
  path?: string;
  referrer?: string | null;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  const sessionId = getSessionId();
  if (!sessionId) return;

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...event, sessionId }),
    keepalive: true,
  }).catch(() => undefined);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === previousPath.current) return;
    const referrer =
      previousPath.current ??
      (typeof document !== "undefined" ? document.referrer || null : null);

    const send = () => {
      track({ name: "page_view", path: pathname, referrer });

      const productMatch = pathname.match(/\/product\/([^/]+)/);
      if (productMatch?.[1]) {
        track({
          name: "product_view",
          path: pathname,
          entityType: "product",
          entityId: productMatch[1],
        });
      }

      if (pathname.includes("/checkout")) {
        track({ name: "checkout_view", path: pathname });
      }
      if (pathname.includes("/cart")) {
        track({ name: "cart_view", path: pathname });
      }
      if (pathname.includes("/search")) {
        track({ name: "search_view", path: pathname });
      }

      previousPath.current = pathname;
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idle = window as Window & {
        requestIdleCallback: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback: (id: number) => void;
      };
      const id = idle.requestIdleCallback(send, { timeout: 2000 });
      return () => idle.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(send, 400);
    return () => globalThis.clearTimeout(timer);
  }, [pathname]);

  return null;
}

export function trackCommerceEvent(
  name: "add_to_cart" | "add_to_wishlist" | "purchase" | "search_click",
  meta?: Record<string, unknown>,
) {
  track({ name, meta, path: typeof window !== "undefined" ? window.location.pathname : undefined });
}

export function trackPopupEvent(
  name: "popup_impression" | "popup_click" | "popup_dismiss",
  campaignId: string,
) {
  track({
    name,
    entityType: "popup",
    entityId: campaignId,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}
