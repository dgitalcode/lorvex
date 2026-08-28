"use client";

import { StorefrontImage } from "@/components/shared/storefront-image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { FloatingPurchaseBar } from "@/components/product/floating-cta";
import { StorySections } from "@/components/product/story-sections";
import { ReviewsSection, QuestionsSection } from "@/components/product/reviews-qa";
import {
  LiveViewers,
  RecentPurchasePopup,
  RecentlyViewedRail,
} from "@/components/product/social-proof";
import { getPdpStrings } from "@/components/product/strings";
import { FadeIn } from "@/components/shared/motion";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { useRecentlyViewedStore } from "@/stores/commerce-stores";
import type { PdpContext } from "@/components/product/types";

const PANEL_SENTINEL_ID = "pdp-purchase-panel";

export function ProductExperience({
  context,
  faqItems,
  collections,
}: {
  context: PdpContext;
  faqItems: { id: string; question: string; answer: string }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverUrl: string | null;
  }[];
}) {
  const { product, locale, rails, recentPurchase } = context;
  const t = getPdpStrings(locale);
  const pushRecent = useRecentlyViewedStore((state) => state.push);

  const defaultVariant =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [selectedId, setSelectedId] = useState(defaultVariant?.id ?? "");
  const selected =
    product.variants.find((v) => v.id === selectedId) ?? defaultVariant;
  const [activeUrl, setActiveUrl] = useState(
    defaultVariant?.imageUrl ?? product.images[0]?.url ?? "",
  );

  useEffect(() => pushRecent(product.id), [product.id, pushRecent]);

  const galleryImages = product.images.length
    ? product.images
    : [{ id: "fallback", type: "IMAGE" as const, url: "/icons/icon.svg", alt: product.name }];
  const variantImage = selected?.imageUrl;
  const images =
    variantImage && !galleryImages.some((img) => img.url === variantImage)
      ? [
          {
            id: `variant-${selected.id}`,
            type: "IMAGE" as const,
            url: variantImage,
            alt: selected.name,
          },
          ...galleryImages,
        ]
      : galleryImages;

  if (!selected) return null;

  return (
    <div className="page-pad">
      <div className="luxury-container">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div className="min-w-0">
            <ProductGallery
              name={product.name}
              images={images}
              videos={product.videos}
              spinFrames={product.spinFrames}
              activeUrl={activeUrl}
              onActiveUrlChange={setActiveUrl}
              hotspotSpecs={product.specifications.filter((s) =>
                ["Movement", "Glass", "Case", "Water"].includes(s.group),
              )}
            />
          </div>

          <FadeIn
            y={18}
            delay={0.1}
            className="lg:sticky lg:top-[var(--page-offset)] lg:self-start"
          >
            <div id={PANEL_SENTINEL_ID}>
              <PurchasePanel
                product={product}
                locale={locale}
                selected={selected}
                onSelectVariant={(variant) => {
                  setSelectedId(variant.id);
                  if (variant.imageUrl) setActiveUrl(variant.imageUrl);
                }}
              />
              <LiveViewers productId={product.id} locale={locale} />
            </div>
          </FadeIn>
        </div>

        <StorySections
          product={product}
          selected={selected}
          locale={locale}
          faqItems={faqItems}
        />

        <section id="reviews" className="section-pad-sm border-t border-border/60">
          <FadeIn>
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
              {t.reviews}
            </p>
            <h2 className="mt-2 font-display text-4xl">{t.reviews}</h2>
          </FadeIn>
          <ReviewsSection reviews={product.reviews} locale={locale} />
        </section>

        <section className="section-pad-sm border-t border-border/60">
          <FadeIn>
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
              Q&A
            </p>
            <h2 className="mt-2 font-display text-4xl">{t.questions}</h2>
          </FadeIn>
          <QuestionsSection questions={product.questions} locale={locale} />
        </section>

        {rails.frequentlyBought.length > 0 && (
          <Rail
            eyebrow={t.selectedForYou}
            title={t.frequentlyBought}
            products={rails.frequentlyBought}
            locale={locale}
          />
        )}

        {rails.aiRecommendations.length > 0 && (
          <Rail
            eyebrow={t.aiPicksSub}
            title={t.aiPicks}
            products={rails.aiRecommendations}
            locale={locale}
          />
        )}

        {collections.length > 0 && (
          <section className="section-pad-sm border-t border-border/60">
            <FadeIn>
              <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
                LORVEX
              </p>
              <h2 className="mt-2 font-display text-4xl">
                {t.relatedCollections}
              </h2>
            </FadeIn>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {collections.map((collection, i) => (
                <FadeIn key={collection.id} delay={i * 0.08}>
                  <Link
                    href={`/${locale}/shop?collection=${collection.slug}`}
                    className="group block"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden bg-secondary">
                      {collection.coverUrl && (
                        <StorefrontImage
                          src={collection.coverUrl}
                          alt={collection.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                        />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <span className="absolute inset-x-0 bottom-0 p-6">
                        <span className="block font-display text-2xl text-white">
                          {collection.name}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/80 transition-colors group-hover:text-white">
                          {t.exploreCollection}
                          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
                        </span>
                      </span>
                    </span>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </section>
        )}

        {rails.related.length > 0 && (
          <Rail
            eyebrow={t.selectedForYou}
            title={t.youMayLike}
            products={rails.related}
            locale={locale}
          />
        )}

        <RecentlyViewedRail
          currentProductId={product.id}
          locale={locale}
          title={t.recentlyViewed}
        />
      </div>

      <FloatingPurchaseBar
        product={product}
        locale={locale}
        selected={selected}
        watchTargetId={PANEL_SENTINEL_ID}
      />
      <RecentPurchasePopup
        purchase={recentPurchase}
        productImageUrl={product.images[0]?.url ?? null}
        locale={locale}
      />
    </div>
  );
}

function Rail({
  eyebrow,
  title,
  products,
  locale,
}: {
  eyebrow: string;
  title: string;
  products: ProductCardData[];
  locale: PdpContext["locale"];
}) {
  return (
    <section className="section-pad-sm border-t border-border/60">
      <FadeIn>
        <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-4xl">{title}</h2>
      </FadeIn>
      <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {products.map((item, i) => (
          <FadeIn key={item.id} delay={i * 0.06}>
            <ProductCard product={item} locale={locale} />
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
