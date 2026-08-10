import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ProductCardData } from "@/components/storefront/product-card";
import { Prisma } from "@prisma/client";

const DEFAULT_SYNONYMS: Record<string, string[]> = {
  montre: ["watch", "timepiece", "ساعة"],
  watch: ["montre", "timepiece", "ساعة"],
  automatique: ["automatic", "auto", "أوتوماتيك"],
  automatic: ["automatique", "auto"],
  diver: ["plongeur", "diving", "غواص"],
  plongeur: ["diver", "diving"],
  chrono: ["chronographe", "chronograph"],
  chronographe: ["chrono", "chronograph"],
  or: ["gold", "ذهب"],
  gold: ["or", "ذهب"],
  acier: ["steel", "فولاذ"],
  steel: ["acier", "فولاذ"],
  limited: ["limité", "edition limitée", "محدود"],
  limité: ["limited", "edition limitée"],
};

function normalizeQuery(q: string) {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i;
    row[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const temp = row[j + 1];
      const cost = a[i] === b[j] ? 0 : 1;
      row[j + 1] = Math.min(row[j + 1] + 1, row[j] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

function expandWithSynonyms(normalized: string) {
  const tokens = normalized.split(" ").filter(Boolean);
  const expanded = new Set<string>([normalized, ...tokens]);
  for (const token of tokens) {
    const defaults = DEFAULT_SYNONYMS[token] ?? [];
    defaults.forEach((s) => expanded.add(s));
  }
  return { tokens, expanded: [...expanded] };
}

function toCard(product: {
  id: string;
  name: string;
  slug: string;
  basePrice: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  currency: string;
  isNewArrival: boolean;
  isLimitedEdition: boolean;
  isBestSeller: boolean;
  brand: { name: string };
  media: { url: string }[];
  variants: { price: Prisma.Decimal | null; imageUrl: string | null }[];
}): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brand.name,
    imageUrl:
      product.media[0]?.url ??
      product.variants[0]?.imageUrl ??
      "/icons/icon.svg",
    price: Number(product.variants[0]?.price ?? product.basePrice),
    compareAtPrice: product.compareAtPrice
      ? Number(product.compareAtPrice)
      : null,
    currency: product.currency,
    isNewArrival: product.isNewArrival,
    isLimitedEdition: product.isLimitedEdition,
    isBestSeller: product.isBestSeller,
  };
}

const productSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  barcode: true,
  basePrice: true,
  compareAtPrice: true,
  currency: true,
  isNewArrival: true,
  isLimitedEdition: true,
  isBestSeller: true,
  brand: { select: { id: true, name: true, slug: true } },
  collection: { select: { id: true, name: true, slug: true } },
  media: {
    where: { type: "IMAGE" as const },
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  variants: {
    orderBy: [{ isDefault: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
    select: {
      price: true,
      imageUrl: true,
      barcode: true,
      sku: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type SmartSearchResult = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  score: number;
  matchType: "exact" | "sku" | "barcode" | "fuzzy" | "synonym" | "semantic";
};

export async function smartSearch(input: {
  q: string;
  locale?: string;
  limit?: number;
  sessionId?: string | null;
  userId?: string | null;
  source?: string;
  mode?: "text" | "barcode" | "qr";
}) {
  const raw = input.q.trim();
  const limit = input.limit ?? 8;
  if (raw.length < 1) {
    return { results: [] as SmartSearchResult[], trending: [] as string[], recent: [] as string[] };
  }

  const normalized = normalizeQuery(raw);
  const locale = input.locale ?? "fr";
  const isCodeMode =
    input.mode === "barcode" ||
    input.mode === "qr" ||
    /^[A-Z0-9-]{6,}$/i.test(raw.replace(/\s/g, ""));

  let dbSynonyms: { synonym: string }[] = [];
  try {
    dbSynonyms = await prisma.searchSynonym.findMany({
      where: {
        locale,
        term: { equals: normalized, mode: "insensitive" },
      },
      select: { synonym: true },
      take: 20,
    });
  } catch {
    dbSynonyms = [];
  }

  const { tokens, expanded } = expandWithSynonyms(normalized);
  dbSynonyms.forEach((s) => expanded.push(normalizeQuery(s.synonym)));

  const orFilters: Prisma.ProductWhereInput[] = [
    { name: { contains: raw, mode: "insensitive" } },
    { sku: { contains: raw, mode: "insensitive" } },
    { barcode: { contains: raw, mode: "insensitive" } },
    { shortDescription: { contains: raw, mode: "insensitive" } },
    { brand: { name: { contains: raw, mode: "insensitive" } } },
    { variants: { some: { sku: { contains: raw, mode: "insensitive" } } } },
    { variants: { some: { barcode: { contains: raw, mode: "insensitive" } } } },
  ];

  for (const term of expanded.slice(0, 12)) {
    if (term.length < 2) continue;
    orFilters.push({ name: { contains: term, mode: "insensitive" } });
    orFilters.push({ brand: { name: { contains: term, mode: "insensitive" } } });
  }

  const candidates = await prisma.product.findMany({
    where: { status: "ACTIVE", OR: orFilters },
    select: productSelect,
    take: 40,
  });

  // Fuzzy pass if few results
  let fuzzyPool = candidates;
  if (candidates.length < 4 && tokens[0]?.length >= 3) {
    const pool = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: productSelect,
      take: 80,
    });
    fuzzyPool = [
      ...candidates,
      ...pool.filter(
        (p) =>
          !candidates.some((c) => c.id === p.id) &&
          (levenshtein(normalizeQuery(p.name), normalized) <= 3 ||
            levenshtein(normalizeQuery(p.brand.name), normalized) <= 2 ||
            tokens.some(
              (t) =>
                levenshtein(normalizeQuery(p.name).slice(0, t.length + 2), t) <=
                2,
            )),
      ),
    ];
  }

  const scored: SmartSearchResult[] = fuzzyPool.map((product) => {
    const nameN = normalizeQuery(product.name);
    const brandN = normalizeQuery(product.brand.name);
    const skuN = normalizeQuery(product.sku);
    let score = 0;
    let matchType: SmartSearchResult["matchType"] = "semantic";

    if (isCodeMode) {
      const code = raw.replace(/\s/g, "").toUpperCase();
      if (
        product.sku.toUpperCase() === code ||
        product.barcode?.toUpperCase() === code ||
        product.variants.some(
          (v) =>
            v.sku?.toUpperCase() === code || v.barcode?.toUpperCase() === code,
        )
      ) {
        score += 100;
        matchType = "barcode";
      }
    }

    if (nameN === normalized || brandN === normalized) {
      score += 50;
      matchType = "exact";
    } else if (nameN.includes(normalized) || brandN.includes(normalized)) {
      score += 30;
      matchType = "exact";
    } else if (skuN.includes(normalized)) {
      score += 40;
      matchType = "sku";
    } else if (expanded.some((t) => nameN.includes(t) || brandN.includes(t))) {
      score += 18;
      matchType = "synonym";
    } else {
      const dist = Math.min(
        levenshtein(nameN, normalized),
        levenshtein(brandN, normalized),
      );
      score += Math.max(0, 12 - dist * 2);
      matchType = "fuzzy";
    }

    if (product.isBestSeller) score += 4;
    if (product.isNewArrival) score += 3;
    if (product.isLimitedEdition) score += 2;

    // Lightweight semantic: token overlap as bag-of-words affinity
    const nameTokens = new Set(nameN.split(" "));
    const overlap = tokens.filter((t) => nameTokens.has(t)).length;
    score += overlap * 5;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brandName: product.brand.name,
      imageUrl: product.media[0]?.url ?? product.variants[0]?.imageUrl ?? undefined,
      price: Number(product.variants[0]?.price ?? product.basePrice),
      currency: product.currency,
      score,
      matchType,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit);

  // Persist analytics (fire-and-forget safe)
  void prisma.searchQuery
    .create({
      data: {
        query: raw,
        normalized,
        userId: input.userId ?? null,
        sessionId: input.sessionId ?? null,
        resultCount: results.length,
        source: input.source ?? "overlay",
      },
    })
    .catch(() => undefined);

  const [trending, recent] = await Promise.all([
    getTrendingSearches(8),
    input.sessionId || input.userId
      ? getRecentSearches({
          sessionId: input.sessionId,
          userId: input.userId,
          limit: 6,
        })
      : Promise.resolve([] as string[]),
  ]);

  return { results, trending, recent };
}

export async function getTrendingSearches(limit = 8) {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const grouped = await prisma.searchQuery.groupBy({
    by: ["normalized"],
    where: { createdAt: { gte: since }, resultCount: { gt: 0 } },
    _count: { _all: true },
    orderBy: { _count: { normalized: "desc" } },
    take: limit,
  });
  return grouped.map((g) => g.normalized);
}

export async function getRecentSearches(input: {
  sessionId?: string | null;
  userId?: string | null;
  limit?: number;
}) {
  const rows = await prisma.searchQuery.findMany({
    where: {
      OR: [
        input.userId ? { userId: input.userId } : undefined,
        input.sessionId ? { sessionId: input.sessionId } : undefined,
      ].filter(Boolean) as Prisma.SearchQueryWhereInput[],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { query: true },
  });
  const unique: string[] = [];
  for (const row of rows) {
    if (!unique.includes(row.query)) unique.push(row.query);
    if (unique.length >= (input.limit ?? 6)) break;
  }
  return unique;
}

export const getCachedTrendingSearches = unstable_cache(
  async () => getTrendingSearches(10),
  ["trending-searches"],
  { revalidate: 300 },
);

export { normalizeQuery, toCard as searchResultToCard };
