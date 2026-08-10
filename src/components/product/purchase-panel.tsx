"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Check,
  FileText,
  GitCompareArrows,
  Heart,
  Link2,
  Printer,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/luxury/magnetic";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useCompareStore, useWishlistStore } from "@/stores/commerce-stores";
import { getPdpStrings } from "@/components/product/strings";
import type { PdpProduct, PdpVariant } from "@/components/product/types";
import type { Locale } from "@/config/site";

const DIAL_SWATCHES: Record<string, string> = {
  noir: "#181614",
  black: "#181614",
  champagne: "#e6d3a3",
  argent: "#d6d6d3",
  silver: "#d6d6d3",
  bleu: "#1d3557",
  blue: "#1d3557",
  vert: "#2d4a3a",
  green: "#2d4a3a",
  blanc: "#f4f1ea",
  white: "#f4f1ea",
  or: "#c9a35a",
  gold: "#c9a35a",
};

function dialSwatch(color: string) {
  return DIAL_SWATCHES[color.toLowerCase()] ?? "#8a8378";
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

function deliveryWindow(locale: Locale) {
  const formatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-MA",
    { day: "numeric", month: "long" },
  );
  const from = new Date();
  from.setDate(from.getDate() + 3);
  const to = new Date();
  to.setDate(to.getDate() + 5);
  return `${formatter.format(from)} — ${formatter.format(to)}`;
}

export function PurchasePanel({
  product,
  locale,
  selected,
  onSelectVariant,
}: {
  product: PdpProduct;
  locale: Locale;
  selected: PdpVariant;
  onSelectVariant: (variant: PdpVariant) => void;
}) {
  const t = getPdpStrings(locale);
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const wishlist = useWishlistStore();
  const compare = useCompareStore();
  const addItem = useCartStore((state) => state.addItem);
  const [cartState, setCartState] = useState<"idle" | "adding" | "added">(
    "idle",
  );

  const price = selected.price ?? product.price;
  const compareAt = selected.compareAtPrice ?? product.compareAtPrice;
  const inWishlist = mounted && wishlist.has(product.id);
  const inCompare = mounted && compare.has(product.id);
  const lowStock =
    selected.stock > 0 && selected.stock <= (selected.lowStockAt || 3);
  const avgRating = product.reviews.length
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
      product.reviews.length
    : 0;

  const selectors = useMemo(() => {
    const build = (
      label: string,
      read: (v: PdpVariant) => string | null,
      kind: "swatch" | "text",
    ) => {
      const values = [
        ...new Set(product.variants.map(read).filter(Boolean)),
      ] as string[];
      return { label, read, values, kind };
    };
    return [
      build(t.dialColor, (v) => v.dialColor ?? v.color, "swatch" as const),
      build(t.strap, (v) => v.strapMaterial, "text" as const),
      build(
        t.caseSize,
        (v) => (v.caseSizeMm ? `${v.caseSizeMm} mm` : null),
        "text" as const,
      ),
    ].filter((s) => s.values.length > 0);
  }, [product.variants, t]);

  function pickVariant(read: (v: PdpVariant) => string | null, value: string) {
    const current = selectors.map((s) => ({
      read: s.read,
      value: s.read(selected),
    }));
    const scored = product.variants
      .filter((v) => read(v) === value)
      .map((v) => ({
        v,
        score:
          current.reduce(
            (acc, c) => acc + (c.read(v) === c.value ? 1 : 0),
            0,
          ) + (v.stock > 0 ? 0.5 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    if (scored[0]) onSelectVariant(scored[0].v);
  }

  function addToCart() {
    if (selected.stock < 1 || cartState !== "idle") return;
    setCartState("adding");
    addItem({
      productId: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.name,
      variantName: selected.name,
      imageUrl: selected.imageUrl ?? product.images[0]?.url ?? "",
      price,
      currency: product.currency,
      stock: selected.stock,
    });
    window.setTimeout(() => {
      setCartState("added");
      toast.success(t.added);
      window.setTimeout(() => setCartState("idle"), 1600);
    }, 450);
  }

  async function share() {
    const data = {
      title: product.name,
      text: product.shortDescription ?? product.name,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        toast.success(t.linkCopied);
      }
    } catch {
      // The native share dialog may be cancelled.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t.linkCopied);
    } catch {
      // Clipboard access may be denied.
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/${locale}/shop?brand=${product.brandSlug}`}
          className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-accent"
        >
          {product.brandName}
        </Link>
        {product.isLimitedEdition && (
          <span className="border border-accent/40 bg-accent/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-accent">
            {t.limitedEdition}
          </span>
        )}
        {product.isNewArrival && (
          <span className="border border-border bg-secondary px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {t.newArrival}
          </span>
        )}
      </div>

      <h1 className="mt-3 font-display text-5xl leading-[0.95] md:text-6xl">
        {product.name}
      </h1>

      {product.reviews.length > 0 && (
        <a
          href="#reviews"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex gap-0.5 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < Math.round(avgRating) && "fill-current",
                )}
              />
            ))}
          </span>
          {avgRating.toFixed(1)} · {product.reviews.length} {t.reviews.toLowerCase()}
        </a>
      )}

      <div className="mt-5 flex items-baseline gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={price}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl tabular-nums"
          >
            {formatPrice(price, product.currency)}
          </motion.p>
        </AnimatePresence>
        {compareAt && compareAt > price && (
          <p className="text-sm text-muted-foreground line-through">
            {formatPrice(compareAt, product.currency)}
          </p>
        )}
      </div>

      <p className="mt-6 leading-7 text-muted-foreground">
        {product.shortDescription ?? product.description}
      </p>

      <div className="mt-8 space-y-6 border-y border-border/80 py-7">
        {selectors.map((selector) => (
          <div key={selector.label}>
            <p className="mb-3 flex items-baseline justify-between text-xs uppercase tracking-[0.18em]">
              {selector.label}
              <span className="normal-case tracking-normal text-muted-foreground">
                {selector.read(selected)}
              </span>
            </p>
            <div className="flex flex-wrap gap-2.5">
              {selector.values.map((value) => {
                const active = selector.read(selected) === value;
                const available = product.variants.some(
                  (v) => selector.read(v) === value && v.stock > 0,
                );
                if (selector.kind === "swatch") {
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={value}
                      aria-pressed={active}
                      onClick={() => pickVariant(selector.read, value)}
                      className={cn(
                        "relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300",
                        active
                          ? "border-accent shadow-[0_0_0_1px_var(--accent)]"
                          : "border-border hover:border-foreground/50",
                        !available && "opacity-35",
                      )}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-black/10"
                        style={{ backgroundColor: dialSwatch(value) }}
                      />
                      {active && (
                        <motion.span
                          layoutId="dial-check"
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground"
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </motion.span>
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickVariant(selector.read, value)}
                    className={cn(
                      "border px-4 py-2.5 text-sm transition-all duration-300",
                      active
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-foreground/50",
                      !available && "opacity-35",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "relative flex h-2 w-2 rounded-full",
              selected.stock ? "bg-success" : "bg-destructive",
            )}
          >
            {lowStock && (
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
            )}
          </span>
          <span className={cn(lowStock && "font-medium text-foreground")}>
            {selected.stock
              ? lowStock
                ? t.onlyLeft(selected.stock)
                : t.inStock
              : t.outOfStock}
          </span>
          {lowStock && (
            <span className="text-xs text-muted-foreground">
              · {t.lowStockNote}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Truck className="h-4 w-4 text-accent" />
          <span>
            {t.deliveryEstimate}{" "}
            <span className="text-foreground">
              {mounted ? deliveryWindow(locale) : "…"}
            </span>
            <span className="mt-0.5 block text-xs">{t.deliveryExpress}</span>
          </span>
        </div>
      </div>

      <Magnetic strength={0.1} className="mt-7 flex w-full">
        <Button
          size="xl"
          className="relative w-full overflow-hidden"
          disabled={!selected.stock}
          onClick={addToCart}
          data-cart-state={cartState}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={cartState}
              initial={reduce ? false : { y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2"
            >
              {cartState === "added" ? (
                <>
                  <Check className="h-4 w-4" /> {t.added}
                </>
              ) : cartState === "adding" ? (
                t.adding
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />{" "}
                  {selected.stock ? t.addToCart : t.outOfStock}
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </Magnetic>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          aria-pressed={inWishlist}
          onClick={() => wishlist.toggle(product.id)}
          className="group/wish"
        >
          <motion.span
            whileTap={reduce ? undefined : { scale: 1.35 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="inline-flex"
          >
            <Heart
              className={cn(
                "transition-colors duration-300",
                inWishlist && "fill-accent text-accent",
              )}
            />
          </motion.span>
          {t.wishlist}
        </Button>
        <Button
          variant="outline"
          aria-pressed={inCompare}
          onClick={() => compare.toggle(product.id)}
        >
          <motion.span
            whileTap={reduce ? undefined : { rotate: 180 }}
            transition={{ duration: 0.35 }}
            className="inline-flex"
          >
            <GitCompareArrows className={cn(inCompare && "text-accent")} />
          </motion.span>
          {t.compare}
        </Button>
        <Button variant="outline" onClick={share}>
          <Share2 /> {t.share}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="ghost" size="sm" onClick={copyLink} className="text-xs">
          <Link2 className="h-3.5 w-3.5" /> {t.copyLink}
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href={`/${locale}/product/${product.slug}/specs`}>
            <FileText className="h-3.5 w-3.5" /> {t.specSheet}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          className="text-xs"
        >
          <Printer className="h-3.5 w-3.5" /> {t.printPage}
        </Button>
      </div>

      <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/80 pt-6 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
          {t.authenticity}
        </li>
        <li className="flex items-center gap-2">
          <Award className="h-4 w-4 shrink-0 text-accent" />
          {t.warranty(product.warrantyMonths)}
        </li>
        <li className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 shrink-0 text-accent" />
          {t.returns}
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-accent" />
          {t.securePayment}
        </li>
      </ul>
    </div>
  );
}
