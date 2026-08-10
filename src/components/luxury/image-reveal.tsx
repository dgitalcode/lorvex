"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { cn } from "@/lib/utils";

export function ImageReveal({
  src,
  alt,
  className,
  fill = true,
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      registerGsap();
      if (reduce || !frameRef.current || !imageRef.current) return;

      // Keep image visible by default; animate only when triggered.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: frameRef.current,
          start: "top 90%",
          once: true,
        },
      });

      tl.from(
        frameRef.current,
        {
          clipPath: "inset(100% 0 0 0)",
          duration: 1.05,
          ease: "power3.inOut",
          immediateRender: false,
        },
      ).from(
        imageRef.current,
        {
          scale: 1.12,
          duration: 1.15,
          ease: "power3.out",
          immediateRender: false,
        },
        "-=0.9",
      );
    },
    { dependencies: [src, reduce] },
  );

  return (
    <div ref={frameRef} className={cn("relative overflow-hidden", className)}>
      <div ref={imageRef} className="absolute inset-0 will-change-transform">
        <Image
          src={src}
          alt={alt}
          fill={fill}
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    </div>
  );
}
