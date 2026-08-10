"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

export function LuxuryCursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const hovering = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 380, damping: 32, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 380, damping: 32, mass: 0.4 });
  const sizeTarget = useTransform(hovering, [0, 1], [12, 56]);
  const size = useSpring(sizeTarget, { stiffness: 280, damping: 24 });
  const ringOffset = useTransform(size, (v) => -v / 2);
  const dotTarget = useTransform(hovering, [0, 1], [1, 0.35]);
  const dotScale = useSpring(dotTarget, { stiffness: 280, damping: 24 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    const sync = () =>
      setEnabled(fine.matches && hover.matches && reduce !== true);
    sync();
    fine.addEventListener("change", sync);
    hover.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      hover.removeEventListener("change", sync);
    };
  }, [reduce]);

  useEffect(() => {
    if (!enabled) return;

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const over = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const interactive = Boolean(
        target?.closest(
          "a, button, [role='button'], input, textarea, select, label, .magnetic",
        ),
      );
      hovering.set(interactive ? 1 : 0);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, [enabled, hovering, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] rounded-full border border-white/80 mix-blend-difference"
        style={{
          x: springX,
          y: springY,
          width: size,
          height: size,
          marginLeft: ringOffset,
          marginTop: ringOffset,
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[91] h-1.5 w-1.5 rounded-full bg-accent"
        style={{
          x: springX,
          y: springY,
          scale: dotScale,
          marginLeft: -3,
          marginTop: -3,
        }}
      />
    </>
  );
}
