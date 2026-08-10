"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWishlistStore, useCompareStore } from "@/stores/commerce-stores";
import type { Locale } from "@/config/site";

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
};

export function ProductCard({
  product,
  locale,
  className,
}: {
  product: ProductCardData;
  locale: Locale;
  className?: string;
}) {
  // Persist rehydrates after paint — gate so SSR and hydration markup match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const wishlist = useWishlistStore();
  const compare = useCompareStore();
  const wished = mounted && wishlist.has(product.id);
  const compared = mounted && compare.has(product.id);

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
          className="absolute inset-0 block"
        >
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNewArrival && <Badge variant="accent">New</Badge>}
          {product.isLimitedEdition && <Badge>Limited</Badge>}
          {product.isBestSeller && <Badge variant="muted">Best</Badge>}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-100">
          <button
            type="button"
            aria-label="Wishlist"
            onClick={() => wishlist.toggle(product.id)}
            className={cn(
              "flex h-10 w-10 items-center justify-center bg-background/90 backdrop-blur-md transition-[color,transform] active:scale-[0.86]",
              wished && "text-accent",
            )}
          >
            <Heart className={cn("h-4 w-4", wished && "fill-current")} />
          </button>

          <button
            type="button"
            aria-label="Compare"
            onClick={() => compare.toggle(product.id)}
            className={cn(
              "flex h-10 w-10 items-center justify-center bg-background/90 backdrop-blur-md transition-[color,transform] active:scale-[0.86]",
              compared && "text-accent",
            )}
          >
            <GitCompareArrows className="h-4 w-4" />
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
