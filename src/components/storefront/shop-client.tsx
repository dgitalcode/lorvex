"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/config/site";
import { cn } from "@/lib/utils";

type Facets = {
  brands: { name: string; slug: string }[];
  collections: { name: string; slug: string }[];
  minPrice: number;
  maxPrice: number;
};

type Current = {
  brand?: string;
  collection?: string;
  gender?: string;
  movement?: string;
  sort?: string;
  availability?: string;
  q?: string;
  new?: boolean;
  limited?: boolean;
  page: number;
};

export function ShopClient({
  locale,
  dictionary,
  initial,
  facets,
  current,
}: {
  locale: Locale;
  dictionary: Dictionary;
  initial: {
    total: number;
    page: number;
    pageCount: number;
    products: ProductCardData[];
  };
  facets: Facets;
  current: Current;
}) {
  const router = useRouter();

  function pushParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { ...current, ...patch };
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === false) return;
      if (key === "page" && value === 1) return;
      if (typeof value === "boolean") {
        if (value) params.set(key, "1");
        return;
      }
      params.set(key, String(value));
    });
    router.push(`/${locale}/shop?${params.toString()}`);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-8">
        <FilterGroup title={dictionary.shop.brand}>
          {facets.brands.map((brand) => (
            <FilterChip
              key={brand.slug}
              active={current.brand === brand.slug}
              onClick={() =>
                pushParams({
                  brand: current.brand === brand.slug ? undefined : brand.slug,
                  page: "1",
                })
              }
              label={brand.name}
            />
          ))}
        </FilterGroup>

        <FilterGroup title={dictionary.shop.gender}>
          {["MEN", "WOMEN", "UNISEX"].map((gender) => (
            <FilterChip
              key={gender}
              active={current.gender === gender}
              onClick={() =>
                pushParams({
                  gender: current.gender === gender ? undefined : gender,
                  page: "1",
                })
              }
              label={gender}
            />
          ))}
        </FilterGroup>

        <FilterGroup title={dictionary.shop.movement}>
          {["AUTOMATIC", "MANUAL", "QUARTZ"].map((movement) => (
            <FilterChip
              key={movement}
              active={current.movement === movement}
              onClick={() =>
                pushParams({
                  movement:
                    current.movement === movement ? undefined : movement,
                  page: "1",
                })
              }
              label={movement}
            />
          ))}
        </FilterGroup>

        <FilterGroup title={dictionary.shop.availability}>
          <FilterChip
            active={current.availability === "in_stock"}
            onClick={() =>
              pushParams({
                availability:
                  current.availability === "in_stock" ? undefined : "in_stock",
                page: "1",
              })
            }
            label="In stock"
          />
        </FilterGroup>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/${locale}/shop`)}
        >
          {dictionary.shop.clear}
        </Button>
      </aside>

      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {initial.total} {dictionary.shop.results}
          </p>
          <select
            className="h-10 border border-input bg-transparent px-3 text-sm"
            value={current.sort ?? "newest"}
            onChange={(e) => pushParams({ sort: e.target.value, page: "1" })}
            aria-label={dictionary.shop.sort}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="name">Name</option>
          </select>
        </div>

        {initial.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-border/70 bg-card px-8 py-20 text-center shadow-[var(--shadow-soft)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              LORVEX
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">
              {locale === "ar"
                ? "لا نتائج لهذه الفلاتر"
                : locale === "en"
                  ? "No pieces for these filters"
                  : "Aucune pièce pour ces filtres"}
            </h2>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {locale === "ar"
                ? "أعد ضبط الفلاتر لاكتشاف المجموعة الكاملة."
                : locale === "en"
                  ? "Reset the filters to rediscover the full collection."
                  : "Réinitialisez les filtres pour redécouvrir toute la collection."}
            </p>
            <Button
              variant="outline"
              className="mt-8"
              onClick={() => router.push(`/${locale}/shop`)}
            >
              {dictionary.shop.clear}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:gap-x-6">
            {initial.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                priority={index < 2}
              />
            ))}
          </div>
        )}

        {initial.pageCount > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            {Array.from({ length: initial.pageCount }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => pushParams({ page: String(page) })}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center border text-sm transition-colors",
                    page === initial.page
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground",
                  )}
                >
                  {page}
                </button>
              ),
            )}
          </div>
        )}

        {current.q && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Recherche : {current.q}
          </p>
        )}

        <div className="mt-8 text-center lg:hidden">
          <Link href={`/${locale}/shop`} className="text-sm underline">
            {dictionary.shop.clear}
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border hover:border-foreground",
      )}
    >
      {label}
    </button>
  );
}
