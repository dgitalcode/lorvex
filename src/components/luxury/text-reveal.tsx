"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function TextReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const maskRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      registerGsap();
      if (reduce || !contentRef.current || !maskRef.current) return;
      gsap.from(contentRef.current, {
        yPercent: 100,
        opacity: 0,
        duration: 0.9,
        delay,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: maskRef.current,
          start: "top 90%",
          once: true,
        },
      });
    },
    { dependencies: [delay, reduce] },
  );

  return (
    <span ref={maskRef} className="block overflow-hidden">
      <span
        ref={contentRef}
        className={cn("block will-change-transform", className)}
      >
        {children}
      </span>
    </span>
  );
}

export function SplitHeadline({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      registerGsap();
      if (reduce || !ref.current) return;
      const lines = ref.current.querySelectorAll("[data-line]");
      gsap.from(lines, {
        yPercent: 105,
        duration: 0.95,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.1,
        immediateRender: false,
      });
    },
    { dependencies: [text, reduce] },
  );

  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lines = parts.length > 1 ? parts : [text];

  return (
    <h1 ref={ref} className={cn(className)}>
      {lines.map((line) => (
        <span key={line} className="block overflow-hidden">
          <span data-line className="block will-change-transform">
            {line}
          </span>
        </span>
      ))}
    </h1>
  );
}
