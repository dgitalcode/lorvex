"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { cn } from "@/lib/utils";

export function HorizontalScroll({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      registerGsap();
      if (reduce || !sectionRef.current || !trackRef.current) return;
      if (window.matchMedia("(max-width: 768px)").matches) return;

      const track = trackRef.current;
      const amount = Math.max(0, track.scrollWidth - window.innerWidth + 80);

      const headerOffset = () => {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue("--header-height")
          .trim();
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 72;
      };

      gsap.to(track, {
        x: -amount,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: () => `top ${headerOffset()}px`,
          end: () => `+=${amount * 0.9}`,
          scrub: 0.85,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    { dependencies: [reduce, children] },
  );

  return (
    <section ref={sectionRef} className={cn("relative", className)}>
      {title && (
        <div className="luxury-container pb-8 pt-16">
          <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
        </div>
      )}
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-max gap-5 px-[clamp(1.25rem,4vw,3rem)] pb-16 will-change-transform md:gap-7"
        >
          {children}
        </div>
      </div>
    </section>
  );
}
