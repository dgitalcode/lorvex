"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLuxuryUiStore } from "@/stores/luxury-ui-store";
import { siteConfig } from "@/config/site";

const SESSION_KEY = "lorvex-intro-seen";

export function LoadingScreen() {
  const reduce = useReducedMotion();
  const setLoadingComplete = useLuxuryUiStore((s) => s.setLoadingComplete);
  // Always false for SSR + hydration — decide visibility only after mount.
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduce || sessionStorage.getItem(SESSION_KEY) === "1") {
      const done = requestAnimationFrame(() => setLoadingComplete(true));
      return () => cancelAnimationFrame(done);
    }

    const show = requestAnimationFrame(() => setVisible(true));
    const start = performance.now();
    const duration = 1800;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem(SESSION_KEY, "1");
        setVisible(false);
        window.setTimeout(() => setLoadingComplete(true), 280);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(show);
      cancelAnimationFrame(frame);
    };
  }, [reduce, setLoadingComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0c0b0a] text-[#f2eee6]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
        >
          <motion.p
            className="font-display text-4xl tracking-[0.35em] md:text-5xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {siteConfig.name}
          </motion.p>
          <div className="mt-10 h-px w-40 overflow-hidden bg-white/15">
            <motion.div
              className="h-full bg-[#c9ae7a]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-white/45">
            {String(progress).padStart(2, "0")}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
