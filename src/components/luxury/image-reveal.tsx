"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { StorefrontImage } from "@/components/shared/storefront-image";
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
  sizes?: string;
  fill?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      registerGsap();
      if (reduce || !frameRef.current || !imageRef.current) return;

      gsap.from(imageRef.current, {
        scale: 1.06,
        duration: 1.05,
        ease: "power3.out",
        scrollTrigger: {
          trigger: frameRef.current,
          start: "top 90%",
          once: true,
        },
      });
    },
    { dependencies: [src, reduce] },
  );

  return (
    <div ref={frameRef} className={cn("relative overflow-hidden", className)}>
      <div ref={imageRef} className="absolute inset-0 will-change-transform">
        <StorefrontImage
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
