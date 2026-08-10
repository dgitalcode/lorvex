"use client";

import { usePathname } from "next/navigation";

/**
 * Lightweight route wrapper. Avoid Framer remounts that kill GSAP
 * ScrollTriggers and leave homepage sections stuck at opacity 0.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="min-h-0">
      {children}
    </div>
  );
}
