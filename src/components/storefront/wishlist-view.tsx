"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useWishlistStore } from "@/stores/commerce-stores";
import type { Locale } from "@/config/site";

export function WishlistView({ locale }: { locale: Locale }) {
  const { productIds, toggle } = useWishlistStore();

  if (!productIds.length) {
    return (
      <EmptyState
        icon={Heart}
        eyebrow="LORVEX"
        title={
          locale === "ar"
            ? "قائمة أمنياتك بانتظارك"
            : locale === "en"
              ? "Your wishlist awaits"
              : "Votre wishlist vous attend"
        }
        description={
          locale === "ar"
            ? "احفظ الساعات الاستثنائية أثناء استكشاف المجموعة."
            : locale === "en"
              ? "Save exceptional watches while exploring the collection."
              : "Enregistrez des montres d'exception en explorant la collection."
        }
        actionLabel={
          locale === "ar"
            ? "اكتشف الساعات"
            : locale === "en"
              ? "Discover watches"
              : "Découvrir les montres"
        }
        actionHref={`/${locale}/shop`}
      />
    );
  }

  return (
    <div className="border border-border/80 bg-card p-7 shadow-[var(--shadow-soft)] md:p-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {productIds.length}{" "}
          {locale === "ar"
            ? "قطعة محفوظة"
            : locale === "en"
              ? productIds.length === 1
                ? "saved timepiece"
                : "saved timepieces"
              : productIds.length === 1
                ? "pièce enregistrée"
                : "pièces enregistrées"}
        </p>
        <Button asChild variant="outline">
          <Link href={`/${locale}/shop`}>
            {locale === "ar"
              ? "متابعة التصفح"
              : locale === "en"
                ? "Continue browsing"
                : "Continuer"}
          </Link>
        </Button>
      </div>
      <div className="mt-6 divide-y divide-border/80">
        {productIds.map((id, index) => (
          <div
            key={id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <span className="text-sm">
              {locale === "ar"
                ? `قطعة محفوظة ${index + 1}`
                : locale === "en"
                  ? `Saved timepiece ${index + 1}`
                  : `Pièce enregistrée ${index + 1}`}
            </span>
            <button
              type="button"
              onClick={() => toggle(id)}
              className="flex h-10 items-center gap-2 px-2 text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {locale === "ar"
                ? "إزالة"
                : locale === "en"
                  ? "Remove"
                  : "Retirer"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
