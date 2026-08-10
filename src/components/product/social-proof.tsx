"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, ShoppingBag, X } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { getPdpStrings } from "@/components/product/strings";
import type { RecentPurchase } from "@/components/product/types";
import type { Locale } from "@/config/site";

function sessionId() {
  const key = "lorvex-presence-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function LiveViewers({
  productId,
  locale,
}: {
  productId: string;
  locale: Locale;
}) {
  const t = getPdpStrings(locale);
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const res = await fetch(
          `/api/presence?productId=${productId}&sessionId=${sessionId()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { viewers: number };
        if (!cancelled) setViewers(data.viewers);
      } catch {
        // Presence is decorative; network failures are ignored.
      }
    }

    ping();
    const interval = window.setInterval(ping, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [productId]);

  if (viewers < 1) return null;

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Eye className="h-3.5 w-3.5 text-accent" />
      {t.viewing(viewers)}
    </motion.p>
  );
}

export function RecentPurchasePopup({
  purchase,
  productImageUrl,
  locale,
}: {
  purchase: RecentPurchase;
  productImageUrl: string | null;
  locale: Locale;
}) {
  const t = getPdpStrings(locale);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!purchase) return;
    const show = window.setTimeout(() => setOpen(true), 9000);
    const hide = window.setTimeout(() => setOpen(false), 19000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [purchase]);

  if (!purchase) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-24 left-5 z-40 flex w-[19rem] items-center gap-3 border border-border/80 bg-background/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur-xl print:hidden lg:bottom-6"
          role="status"
        >
          {productImageUrl ? (
            <span className="relative block h-14 w-14 shrink-0 overflow-hidden bg-secondary">
              <Image
                src={productImageUrl}
                alt={purchase.productName}
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-secondary">
              <ShoppingBag className="h-5 w-5 text-accent" />
            </span>
          )}
          <span className="min-w-0 flex-1 text-xs leading-relaxed">
            <span className="block text-muted-foreground">
              {t.recentPurchase(purchase.firstName, purchase.city)}
            </span>
            <span className="block truncate font-medium">
              {purchase.productName}
            </span>
            <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t.minutesAgo(purchase.minutesAgo)}
            </span>
          </span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function RecentlyViewedRail({
  currentProductId,
  locale,
  title,
}: {
  currentProductId: string;
  locale: Locale;
  title: string;
}) {
  const [items, setItems] = useState<
    {
      id: string;
      name: string;
      slug: string;
      brandName: string;
      imageUrl: string;
      price: number;
      currency: string;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const raw = localStorage.getItem("lorvex-recent");
    if (!raw) return;

    let ids: string[] = [];
    try {
      const parsed = JSON.parse(raw) as { state?: { productIds?: string[] } };
      ids = (parsed.state?.productIds ?? []).filter(
        (id) => id !== currentProductId,
      );
    } catch {
      return;
    }
    if (!ids.length) return;

    fetch(`/api/products?ids=${ids.slice(0, 4).join(",")}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: typeof items }) => {
        if (!cancelled) setItems(data.products);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentProductId]);

  if (!items.length) return null;

  return (
    <section className="border-t border-border/60 py-14 print:hidden">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}/product/${item.slug}`}
            className="group block"
          >
            <span className="relative block aspect-square overflow-hidden border border-border/40 bg-secondary">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
            </span>
            <span className="mt-3 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {item.brandName}
            </span>
            <span className="mt-1 block truncate text-sm">{item.name}</span>
            <span className="mt-1 block text-sm tabular-nums text-muted-foreground">
              {formatPrice(item.price, item.currency)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
