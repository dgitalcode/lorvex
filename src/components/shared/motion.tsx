"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal that never leaves content stuck invisible.
 * SSR + hydration render fully visible; animation only runs client-side
 * for elements that start below the fold.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.9;
    if (!belowFold) return;

    el.style.opacity = "0";
    el.style.transform = `translate3d(0, ${y}px, 0)`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.style.transition = `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`;
        el.style.opacity = "1";
        el.style.transform = "translate3d(0, 0, 0)";
        observer.disconnect();
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.style.opacity = "";
      el.style.transform = "";
      el.style.transition = "";
    };
  }, [delay, reduce, y]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}

export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || reduce) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-stagger-item]"),
    );
    if (!items.length) return;

    const rect = root.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.9;

    if (belowFold) {
      items.forEach((item) => {
        item.style.opacity = "0";
        item.style.transform = "translate3d(0, 16px, 0)";
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        items.forEach((item, index) => {
          const itemDelay = delay + index * 0.08;
          item.style.transition = `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${itemDelay}s, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${itemDelay}s`;
          item.style.opacity = "1";
          item.style.transform = "translate3d(0, 0, 0)";
        });
        observer.disconnect();
      },
      { threshold: 0.06, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(root);
    return () => {
      observer.disconnect();
      items.forEach((item) => {
        item.style.opacity = "";
        item.style.transform = "";
        item.style.transition = "";
      });
    };
  }, [delay, reduce]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-stagger-item className={className}>
      {children}
    </div>
  );
}

export function CountUp({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {value.toLocaleString("fr-MA")}
      {suffix}
    </span>
  );
}
