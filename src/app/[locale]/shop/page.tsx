import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/i18n/get-dictionary";
import { localePageMetadata } from "@/lib/page-metadata";
import { shopQueryIsIndexable } from "@/lib/seo-indexability";
import { storefrontCopy } from "@/content/storefront-copy";
import { searchProducts, getCachedFilterFacets } from "@/server/repositories/catalog";
import { ShopClient } from "@/components/storefront/shop-client";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) return {};
  const copy = storefrontCopy(localeParam);
  const sp = await searchParams;
  const indexable = shopQueryIsIndexable(sp);
  return localePageMetadata({
    locale: localeParam,
    path: "/shop",
    title: copy.shopTitle,
    description: copy.shopDescription,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  });
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const dictionary = getDictionary(locale);
  const copy = storefrontCopy(locale);
  const sp = await searchParams;

  const get = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const page = Number(get("page") ?? "1") || 1;
  const [result, facets] = await Promise.all([
    searchProducts({
      brand: get("brand"),
      collection: get("collection"),
      gender: get("gender"),
      movement: get("movement"),
      color: get("color"),
      caseMaterial: get("caseMaterial"),
      strapMaterial: get("strapMaterial"),
      dialColor: get("dialColor"),
      q: get("q"),
      new: get("new") === "1",
      limited: get("limited") === "1",
      availability: get("availability") === "in_stock" ? "in_stock" : "all",
      minPrice: get("minPrice") ? Number(get("minPrice")) : undefined,
      maxPrice: get("maxPrice") ? Number(get("maxPrice")) : undefined,
      waterResistance: get("waterResistance")
        ? Number(get("waterResistance"))
        : undefined,
      sort: (get("sort") as "newest" | "price_asc" | "price_desc" | "name") ?? "newest",
      page,
      pageSize: 12,
    }).catch(() => ({
      total: 0,
      page: 1,
      pageSize: 12,
      pageCount: 1,
      products: [],
    })),
    getCachedFilterFacets().catch(() => ({
      brands: [],
      collections: [],
      minPrice: 0,
      maxPrice: 0,
    })),
  ]);

  return (
    <div className="page-pad">
      <div className="luxury-container pb-20">
        <div className="mb-10 border-b border-border pb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            LORVEX
          </p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">
            {copy.shopTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {copy.shopLead}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.total} {dictionary.shop.results}
          </p>
        </div>
        <ShopClient
          locale={locale}
          dictionary={dictionary}
          initial={result}
          facets={facets}
          current={{
            brand: get("brand"),
            collection: get("collection"),
            gender: get("gender"),
            movement: get("movement"),
            sort: get("sort") ?? "newest",
            availability: get("availability"),
            q: get("q"),
            new: get("new") === "1",
            limited: get("limited") === "1",
            page,
          }}
        />
      </div>
    </div>
  );
}
