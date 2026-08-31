"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { Heart, GitCompareArrows, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resolveAddToCartIntent } from "@/lib/add-to-cart-intent";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore, useCompareStore } from "@/stores/commerce-stores";
import type { Locale } from "@/config/site";
import { getDictionary } from "@/i18n/get-dictionary";
import { storefrontCopy } from "@/content/storefront-copy";
import { StorefrontImage } from "@/components/shared/storefront-image";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  isNewArrival?: boolean;
  isLimitedEdition?: boolean;
  isBestSeller?: boolean;
  variantId?: string | null;
  variantName?: string | null;
  stock?: number;
};

function stopCardNavigation(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function ProductCard({
  product,
  locale,
  className,
  priority = false,
}: {
  product: ProductCardData;
  locale: Locale;
  className?: string;
  priority?: boolean;
}) {
  // Persist rehydrates after paint — gate so SSR and hydration markup match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const copy = getDictionary(locale);
  const wishlist = useWishlistStore();
  const compare = useCompareStore();
  const addItem = useCartStore((state) => state.addItem);
  const wished = mounted && wishlist.has(product.id);
  const compared = mounted && compare.has(product.id);
  const stock = product.stock ?? 0;
  const canAdd = Boolean(product.variantId) && stock > 0;

  const actionClass = cn(
    "pointer-events-auto relative z-10 flex h-11 w-11 items-center justify-center appearance-none border-0 bg-transparent p-0",
    "text-[#f7f5f1] [filter:drop-shadow(0_0_1.2px_rgb(18_17_15))_drop-shadow(0_2px_6px_rgb(0_0_0_/_0.72))]",
    "transition-[transform,color,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "hover:scale-110 hover:text-accent",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    "active:scale-[0.96] motion-reduce:hover:scale-100",
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col hover-lift",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden border border-border/40 bg-secondary">
        <Link
          href={`/${locale}/product/${product.slug}`}
          className="absolute inset-0 z-0 block"
        >
          <StorefrontImage
            src={product.imageUrl}
            alt={storefrontCopy(locale).watchAlt(product.name)}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            quality={80}
            priority={priority}
            className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.03] md:group-focus-within:scale-[1.03] motion-reduce:scale-100"
          />
        </Link>

        {/* Desktop hover/focus: charcoal veil (~0.80 photo), never on the Image itself. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] hidden bg-[rgb(18_17_15_/_0.2)] opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:block md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        />

        <div className="absolute start-3 top-3 z-[2] flex flex-col gap-1.5">
          {product.isNewArrival && <Badge variant="accent">New</Badge>}
          {product.isLimitedEdition && <Badge>Limited</Badge>}
          {product.isBestSeller && <Badge variant="muted">Best</Badge>}
        </div>

        <div
          className={cn(
            "product-card-icon-bloom pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 justify-center gap-4",
            "opacity-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "md:flex md:group-hover:opacity-100 md:group-focus-within:opacity-100",
          )}
        >
          <button
            type="button"
            aria-label={copy.product.wishlist}
            aria-pressed={wished}
            onClick={(event) => {
              stopCardNavigation(event);
              wishlist.toggle(product.id);
            }}
            className={cn(actionClass, wished && "text-accent")}
          >
            <Heart className={cn("h-6 w-6", wished && "fill-current")} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            aria-label={copy.product.compare}
            aria-pressed={compared}
            onClick={(event) => {
              stopCardNavigation(event);
              compare.toggle(product.id);
            }}
            className={cn(actionClass, compared && "text-accent")}
          >
            <GitCompareArrows className="h-6 w-6" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            aria-label={copy.product.addToCart}
            disabled={!canAdd}
            onClick={(event) => {
              stopCardNavigation(event);
              if (!product.variantId) return;
              const intent = resolveAddToCartIntent(stock, "idle");
              if (!intent.add) return;
              addItem({
                productId: product.id,
                variantId: product.variantId,
                slug: product.slug,
                name: product.name,
                variantName: product.variantName || product.name,
                imageUrl: product.imageUrl,
                price: product.price,
                currency: product.currency,
                stock,
              });
            }}
            className={cn(actionClass, "disabled:opacity-40")}
          >
            <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {product.brandName}
        </p>
        <Link
          href={`/${locale}/product/${product.slug}`}
          className="font-display text-xl leading-tight transition-colors hover:text-accent"
        >
          {product.name}
        </Link>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm tracking-wide">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice, product.currency)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
