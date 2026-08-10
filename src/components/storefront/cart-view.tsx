"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import type { Locale } from "@/config/site";

export function CartView({ locale }: { locale: Locale }) {
  const { items, removeItem, updateQuantity } = useCartStore();
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const currency = items[0]?.currency ?? "MAD";

  if (!items.length) {
    return (
      <div className="luxury-container flex min-h-[70vh] items-center justify-center py-24">
        <EmptyState
          icon={ShoppingBag}
          eyebrow="LORVEX"
          title={
            locale === "ar"
              ? "سلتك فارغة"
              : locale === "en"
                ? "Your cart is empty"
                : "Votre panier est vide"
          }
          description={
            locale === "ar"
              ? "اكتشف ساعة تستحق مجموعتك."
              : locale === "en"
                ? "Discover a timepiece worthy of your collection."
                : "Découvrez une montre digne de votre collection."
          }
          actionLabel={
            locale === "ar"
              ? "استكشف الساعات"
              : locale === "en"
                ? "Explore watches"
                : "Explorer les montres"
          }
          actionHref={`/${locale}/shop`}
          className="w-full max-w-xl border-0 bg-transparent shadow-none"
        />
      </div>
    );
  }

  return (
    <div className="luxury-container pb-24 page-pad">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        LORVEX
      </p>
      <h1 className="mt-3 font-display text-5xl md:text-6xl">
        {locale === "ar"
          ? "اختيارك"
          : locale === "en"
            ? "Your selection"
            : "Votre sélection"}
      </h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_min(380px,100%)]">
        <div className="divide-y divide-border/80">
          {items.map((item) => (
            <article
              key={item.variantId}
              className="grid grid-cols-[100px_1fr] gap-5 py-7 sm:grid-cols-[132px_1fr_auto]"
            >
              <Link
                href={`/${locale}/product/${item.slug}`}
                className="relative aspect-[4/5] overflow-hidden border border-border/40 bg-secondary"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="140px"
                  className="object-cover object-center"
                />
              </Link>
              <div>
                <Link
                  href={`/${locale}/product/${item.slug}`}
                  className="font-display text-2xl transition-colors hover:text-accent"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.variantName}
                </p>
                <p className="mt-3 text-sm tabular-nums">
                  {formatPrice(item.price, item.currency)}
                </p>
                <div className="mt-5 inline-flex items-center border border-border/80">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() =>
                      item.quantity === 1
                        ? removeItem(item.variantId)
                        : updateQuantity(item.variantId, item.quantity - 1)
                    }
                    className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-muted"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-9 text-center text-sm tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={item.quantity >= item.stock}
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity + 1)
                    }
                    className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:flex-col sm:items-end sm:justify-between">
                <strong className="text-sm tabular-nums">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </strong>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit border border-border/80 bg-card p-7 shadow-[var(--shadow-soft)] lg:sticky lg:top-[var(--page-offset)]">
          <h2 className="font-display text-3xl">
            {locale === "ar"
              ? "ملخص الطلب"
              : locale === "en"
                ? "Order summary"
                : "Récapitulatif"}
          </h2>
          <div className="mt-6 flex justify-between border-b border-border/80 pb-5">
            <span className="text-muted-foreground">
              {locale === "ar"
                ? "المجموع الفرعي"
                : locale === "en"
                  ? "Subtotal"
                  : "Sous-total"}
            </span>
            <strong className="tabular-nums">
              {formatPrice(subtotal, currency)}
            </strong>
          </div>
          <div className="flex justify-between py-5 text-sm">
            <span className="text-muted-foreground">
              {locale === "ar"
                ? "الشحن"
                : locale === "en"
                  ? "Shipping"
                  : "Livraison"}
            </span>
            <span>
              {locale === "ar"
                ? "يُحسب عند الدفع"
                : locale === "en"
                  ? "Calculated at checkout"
                  : "Calculée au paiement"}
            </span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {locale === "ar"
              ? "الضرائب مشمولة. دفع آمن وتوصيل مؤمّن في جميع أنحاء المغرب."
              : locale === "en"
                ? "Taxes included. Secure checkout and insured delivery throughout Morocco."
                : "Taxes incluses. Paiement sécurisé et livraison assurée partout au Maroc."}
          </p>
          <Button asChild size="xl" className="mt-7 w-full">
            <Link href={`/${locale}/checkout`}>
              {locale === "ar"
                ? "إتمام الشراء"
                : locale === "en"
                  ? "Proceed to checkout"
                  : "Procéder au paiement"}
            </Link>
          </Button>
          <Button asChild variant="link" className="mt-2 w-full">
            <Link href={`/${locale}/shop`}>
              {locale === "ar"
                ? "متابعة التسوق"
                : locale === "en"
                  ? "Continue shopping"
                  : "Continuer vos achats"}
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
