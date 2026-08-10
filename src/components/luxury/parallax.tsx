"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { cn } from "@/lib/utils";

export function Parallax({
  children,
  className,
  speed = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      registerGsap();
      if (reduce || !ref.current) return;

      gsap.to(ref.current, {
        yPercent: speed * 100,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current.parentElement ?? ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { dependencies: [speed, reduce] },
  );

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
