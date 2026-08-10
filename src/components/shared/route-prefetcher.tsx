"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Prefetches critical storefront routes after idle for faster navigation. */
export function RoutePrefetcher({
  locale,
  routes,
}: {
  locale: string;
  routes?: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const paths =
      routes ??
      [
        `/${locale}/shop`,
        `/${locale}/collections`,
        `/${locale}/cart`,
        `/${locale}/search`,
      ];

    const run = () => {
      for (const path of paths) {
        try {
          router.prefetch(path);
        } catch {
          // prefetch is best-effort
        }
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idle = window as Window & {
        requestIdleCallback: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback: (id: number) => void;
      };
      const id = idle.requestIdleCallback(run, { timeout: 2500 });
      return () => idle.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(run, 1200);
    return () => globalThis.clearTimeout(timer);
  }, [locale, routes, router]);

  return (
    <span className="sr-only" aria-hidden>
      {routes?.map((href) => (
        <Link key={href} href={href} prefetch />
      ))}
    </span>
  );
}
