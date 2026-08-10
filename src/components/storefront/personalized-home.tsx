"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { FadeIn } from "@/components/shared/motion";
import type { Locale } from "@/config/site";

type PersonalizedPayload = {
  isReturning: boolean;
  continueShopping: ProductCardData[];
  forYou: ProductCardData[];
  favoriteBrandProducts: ProductCardData[];
  recommendedCollections: {
    id: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    description: string | null;
  }[];
};

function sessionId() {
  const key = "lorvex-presence-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function readRecentIds(): string[] {
  try {
    const raw = localStorage.getItem("lorvex-recent");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { state?: { productIds?: string[] } };
    return parsed.state?.productIds ?? [];
  } catch {
    return [];
  }
}

const copy = {
  fr: {
    welcomeBack: "Bon retour",
    continue: "Continuer votre sélection",
    forYou: "Sélectionné pour vous",
    brands: "Vos maisons préférées",
    collections: "Collections recommandées",
  },
  en: {
    welcomeBack: "Welcome back",
    continue: "Continue shopping",
    forYou: "Chosen for you",
    brands: "Your favorite houses",
    collections: "Recommended collections",
  },
  ar: {
    welcomeBack: "مرحبًا بعودتك",
    continue: "تابع التسوّق",
    forYou: "مختار لك",
    brands: "دور الساعات المفضلة",
    collections: "مجموعات موصى بها",
  },
} as const;

export function PersonalizedHomeBlocks({ locale }: { locale: Locale }) {
  const [data, setData] = useState<PersonalizedPayload | null>(null);
  const t = copy[locale] ?? copy.fr;

  useEffect(() => {
    let cancelled = false;
    const recentProductIds = readRecentIds().slice(0, 12);

    fetch("/api/personalization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId(),
        recentProductIds,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PersonalizedPayload | null) => {
        if (!cancelled && payload) setData(payload);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || !data.isReturning) return null;

  return (
    <div className="space-y-2">
      {data.continueShopping.length > 0 && (
        <section className="section-pad-sm">
          <div className="luxury-container">
            <FadeIn>
              <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
                {t.welcomeBack}
              </p>
              <h2 className="mt-2 font-display text-4xl">{t.continue}</h2>
            </FadeIn>
            <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {data.continueShopping.slice(0, 4).map((product, i) => (
                <FadeIn key={product.id} delay={i * 0.05}>
                  <ProductCard product={product} locale={locale} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.forYou.length > 0 && (
        <section className="section-pad-sm">
          <div className="luxury-container">
            <FadeIn>
              <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
                LORVEX
              </p>
              <h2 className="mt-2 font-display text-4xl">{t.forYou}</h2>
            </FadeIn>
            <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {data.forYou.slice(0, 4).map((product, i) => (
                <FadeIn key={product.id} delay={i * 0.05}>
                  <ProductCard product={product} locale={locale} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.recommendedCollections.length > 0 && (
        <section className="section-pad-sm">
          <div className="luxury-container">
            <FadeIn>
              <h2 className="font-display text-4xl">{t.collections}</h2>
            </FadeIn>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {data.recommendedCollections.map((collection, i) => (
                <FadeIn key={collection.id} delay={i * 0.05}>
                  <Link
                    href={`/${locale}/shop?collection=${collection.slug}`}
                    className="group block"
                  >
                    <span className="relative block aspect-[4/5] overflow-hidden bg-secondary">
                      {collection.coverUrl && (
                        <Image
                          src={collection.coverUrl}
                          alt={collection.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                        <span className="font-display text-2xl text-white">
                          {collection.name}
                        </span>
                      </span>
                    </span>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.favoriteBrandProducts.length > 0 && (
        <section className="section-pad-sm">
          <div className="luxury-container">
            <FadeIn>
              <h2 className="font-display text-4xl">{t.brands}</h2>
            </FadeIn>
            <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {data.favoriteBrandProducts.slice(0, 4).map((product, i) => (
                <FadeIn key={product.id} delay={i * 0.05}>
                  <ProductCard product={product} locale={locale} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
