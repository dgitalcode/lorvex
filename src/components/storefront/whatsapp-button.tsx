"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Locale } from "@/config/site";
import { getWhatsAppStrings } from "@/i18n/auth-strings";
import { cn } from "@/lib/utils";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function WhatsAppButton({
  locale,
  whatsappNumber,
}: {
  locale: Locale;
  whatsappNumber: string;
}) {
  const t = getWhatsAppStrings(locale);
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const number = whatsappNumber.replace(/\D/g, "");
  if (!number) return null;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(t.prefill)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.aria}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={cn(
        "group/wa fixed z-[45] print:hidden",
        /* Clear mobile floating purchase bar + iOS home indicator */
        "bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]",
        "right-[max(1.25rem,env(safe-area-inset-right,0px))] left-auto",
        "rtl:right-auto rtl:left-[max(1.25rem,env(safe-area-inset-left,0px))]",
        "lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        ready
          ? "translate-y-0 opacity-100"
          : reduce
            ? "opacity-100"
            : "translate-y-4 opacity-0",
        pressed && "scale-[0.96]",
      )}
    >
      <span className="relative flex items-center">
        {!reduce && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366]/40 wa-pulse"
          />
        )}
        <span
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-lift)]",
            "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:scale-[1.04] hover:shadow-[var(--shadow-lift)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <WhatsAppGlyph className="h-[1.35rem] w-[1.35rem]" />
        </span>
        <span
          className={cn(
            "pointer-events-none absolute end-full top-1/2 me-3 hidden -translate-y-1/2 whitespace-nowrap",
            "border border-border/70 bg-background/95 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-foreground shadow-[var(--shadow-soft)] backdrop-blur-md",
            "opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "lg:block lg:translate-x-1 lg:group-hover/wa:translate-x-0 lg:group-hover/wa:opacity-100",
            "rtl:lg:-translate-x-1 rtl:lg:group-hover/wa:translate-x-0",
            "lg:group-focus-visible/wa:translate-x-0 lg:group-focus-visible/wa:opacity-100",
          )}
        >
          {t.label}
        </span>
      </span>
    </a>
  );
}
