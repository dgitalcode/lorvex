"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { getPdpStrings } from "@/components/product/strings";
import type { PdpProduct, PdpVariant } from "@/components/product/types";
import type { Locale } from "@/config/site";

export function FloatingPurchaseBar({
  product,
  locale,
  selected,
  watchTargetId,
}: {
  product: PdpProduct;
  locale: Locale;
  selected: PdpVariant;
  watchTargetId: string;
}) {
  const t = getPdpStrings(locale);
  const reduce = useReducedMotion();
  const addItem = useCartStore((state) => state.addItem);
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchTargetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchTargetId]);

  const price = selected.price ?? product.price;

  function addToCart() {
    if (selected.stock < 1 || added) return;
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
    setAdded(true);
    toast.success(t.added);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? false : { y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 72, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl print:hidden lg:hidden"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatPrice(price, product.currency)}
              </p>
            </div>
            <button
              type="button"
              disabled={!selected.stock}
              onClick={addToCart}
              className={cn(
                "flex h-12 shrink-0 items-center gap-2 px-6 text-xs uppercase tracking-[0.18em] transition-colors duration-300 disabled:opacity-40",
                added
                  ? "bg-success text-white"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> {t.added}
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  {selected.stock ? t.addToCart : t.outOfStock}
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
