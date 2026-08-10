import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ProductCardData } from "@/components/storefront/product-card";
import { Prisma } from "@prisma/client";

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

const cardInclude = {
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
  },
} satisfies Prisma.ProductInclude;

export type AffinityProfile = {
  brandIds: string[];
  collectionIds: string[];
  priceMin: number | null;
  priceMax: number | null;
  movements: string[];
  recentProductIds: string[];
};

export async function upsertPersonalizationFromBehavior(input: {
  userId?: string | null;
  sessionId?: string | null;
  viewedProductIds?: string[];
}) {
  if (!input.userId && !input.sessionId) return null;

  const productIds = (input.viewedProductIds ?? []).slice(0, 24);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, status: "ACTIVE" },
        select: {
          id: true,
          brandId: true,
          collectionId: true,
          basePrice: true,
          movement: true,
        },
      })
    : [];

  const brandCounts = new Map<string, number>();
  const collectionCounts = new Map<string, number>();
  const movements = new Map<string, number>();
  const prices: number[] = [];

  for (const p of products) {
    brandCounts.set(p.brandId, (brandCounts.get(p.brandId) ?? 0) + 1);
    if (p.collectionId) {
      collectionCounts.set(
        p.collectionId,
        (collectionCounts.get(p.collectionId) ?? 0) + 1,
      );
    }
    movements.set(p.movement, (movements.get(p.movement) ?? 0) + 1);
    prices.push(Number(p.basePrice));
  }

  const favoriteBrandIds = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const favoriteCollectionIds = [...collectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  prices.sort((a, b) => a - b);
  const priceMin = prices.length ? prices[0] : null;
  const priceMax = prices.length ? prices[prices.length - 1] : null;

  const affinities = {
    brands: Object.fromEntries(brandCounts),
    collections: Object.fromEntries(collectionCounts),
    movements: Object.fromEntries(movements),
    recentProductIds: productIds,
  };

  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) {
      // Stale session user id — fall back to session profile only.
      if (!input.sessionId) return null;
    } else {
      return prisma.personalizationProfile.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          favoriteBrandIds,
          favoriteCollectionIds,
          priceMin: priceMin ?? undefined,
          priceMax: priceMax ?? undefined,
          affinities,
          lastSeenAt: new Date(),
        },
        update: {
          favoriteBrandIds,
          favoriteCollectionIds,
          priceMin: priceMin ?? undefined,
          priceMax: priceMax ?? undefined,
          affinities,
          lastSeenAt: new Date(),
        },
      });
    }
  }

  if (!input.sessionId) return null;

  return prisma.personalizationProfile.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      favoriteBrandIds,
      favoriteCollectionIds,
      priceMin: priceMin ?? undefined,
      priceMax: priceMax ?? undefined,
      affinities,
      lastSeenAt: new Date(),
    },
    update: {
      favoriteBrandIds,
      favoriteCollectionIds,
      priceMin: priceMin ?? undefined,
      priceMax: priceMax ?? undefined,
      affinities,
      lastSeenAt: new Date(),
    },
  });
}

export async function getAffinityProfile(input: {
  userId?: string | null;
  sessionId?: string | null;
}): Promise<AffinityProfile> {
  const profile = input.userId
    ? await prisma.personalizationProfile.findUnique({
        where: { userId: input.userId },
      })
    : input.sessionId
      ? await prisma.personalizationProfile.findUnique({
          where: { sessionId: input.sessionId },
        })
      : null;

  const affinities = (profile?.affinities ?? {}) as {
    recentProductIds?: string[];
    movements?: Record<string, number>;
  };

  return {
    brandIds: profile?.favoriteBrandIds ?? [],
    collectionIds: profile?.favoriteCollectionIds ?? [],
    priceMin: profile?.priceMin ? Number(profile.priceMin) : null,
    priceMax: profile?.priceMax ? Number(profile.priceMax) : null,
    movements: Object.keys(affinities.movements ?? {}),
    recentProductIds: affinities.recentProductIds ?? [],
  };
}

/**
 * Hybrid recommendation engine:
 * content affinity + behavior (views) + purchase co-occurrence + trending/new weights.
 */
export async function getHybridRecommendations(input: {
  sourceProductId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  excludeIds?: string[];
  limit?: number;
}): Promise<ProductCardData[]> {
  const limit = input.limit ?? 8;
  const exclude = new Set(input.excludeIds ?? []);
  if (input.sourceProductId) exclude.add(input.sourceProductId);

  const affinity = await getAffinityProfile({
    userId: input.userId,
    sessionId: input.sessionId,
  });

  const source = input.sourceProductId
    ? await prisma.product.findUnique({
        where: { id: input.sourceProductId },
        select: {
          id: true,
          brandId: true,
          collectionId: true,
          movement: true,
          basePrice: true,
        },
      })
    : null;

  const purchasePairs = source
    ? await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          productId: { not: source.id },
          order: {
            items: { some: { productId: source.id } },
            status: { notIn: ["CANCELLED"] },
          },
        },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 12,
      })
    : [];

  const candidates = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: [...exclude] },
    },
    include: cardInclude,
    take: 60,
  });

  const now = Date.now();
  const month = new Date().getMonth();
  const isGiftSeason = month === 11 || month === 0 || month === 1;

  const scored = candidates.map((candidate) => {
    let score = 0;
    const price = Number(candidate.basePrice);
    const base = source ? Number(source.basePrice) : affinity.priceMax ?? price;
    const priceRatio =
      Math.min(price, base) / Math.max(price, base, 1);

    // Content / source affinity
    if (source) {
      if (candidate.brandId === source.brandId) score += 4;
      if (
        candidate.collectionId &&
        candidate.collectionId === source.collectionId
      )
        score += 3;
      if (candidate.movement === source.movement) score += 2;
      score += priceRatio * 2.5;
    }

    // Behavior affinities
    if (affinity.brandIds.includes(candidate.brandId)) score += 3.5;
    if (
      candidate.collectionId &&
      affinity.collectionIds.includes(candidate.collectionId)
    )
      score += 2.5;
    if (affinity.movements.includes(candidate.movement)) score += 1.5;
    if (
      affinity.priceMin != null &&
      affinity.priceMax != null &&
      price >= affinity.priceMin * 0.7 &&
      price <= affinity.priceMax * 1.3
    ) {
      score += 2;
    }

    // Purchase affinity (cross-sell)
    const purchased = purchasePairs.find((p) => p.productId === candidate.id);
    if (purchased) score += Math.min(8, purchased._count._all * 2);

    // Trending / new / seasonal weights
    if (candidate.isBestSeller) score += 1.5;
    if (candidate.isNewArrival) score += 1.2;
    if (candidate.isLimitedEdition) score += isGiftSeason ? 2 : 0.8;

    // Recency of catalog publish as soft freshness
    const ageDays =
      (now - (candidate.publishedAt?.getTime() ?? candidate.createdAt.getTime())) /
      86_400_000;
    if (ageDays < 45) score += 0.8;

    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ candidate }) => toCard(candidate));
}

export async function getPersonalizedHomepage(input: {
  userId?: string | null;
  sessionId?: string | null;
  recentProductIds?: string[];
}) {
  const affinity = await getAffinityProfile(input);
  const recentIds = [
    ...(input.recentProductIds ?? []),
    ...affinity.recentProductIds,
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  const [continueShopping, forYou, favoriteBrandProducts, collections] =
    await Promise.all([
      recentIds.length
        ? prisma.product.findMany({
            where: { id: { in: recentIds.slice(0, 8) }, status: "ACTIVE" },
            include: cardInclude,
          })
        : Promise.resolve([]),
      getHybridRecommendations({
        userId: input.userId,
        sessionId: input.sessionId,
        excludeIds: recentIds,
        limit: 8,
      }),
      affinity.brandIds[0]
        ? prisma.product.findMany({
            where: { status: "ACTIVE", brandId: affinity.brandIds[0] },
            include: cardInclude,
            take: 8,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      affinity.collectionIds.length
        ? prisma.collection.findMany({
            where: { id: { in: affinity.collectionIds } },
            take: 4,
          })
        : prisma.collection.findMany({
            where: { isFeatured: true },
            orderBy: { sortOrder: "asc" },
            take: 4,
          }),
    ]);

  // Preserve order of recentIds for continue shopping
  const byId = new Map(continueShopping.map((p) => [p.id, p]));
  const continueOrdered = recentIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => toCard(p!));

  return {
    isReturning: recentIds.length > 0 || affinity.brandIds.length > 0,
    continueShopping: continueOrdered,
    forYou,
    favoriteBrandProducts: favoriteBrandProducts.map(toCard),
    recommendedCollections: collections,
    affinity,
  };
}

export const getTrendingProductsCached = unstable_cache(
  async (limit = 8) => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", isBestSeller: true },
      include: cardInclude,
      take: limit,
    });
    return products.map(toCard);
  },
  ["trending-products"],
  { revalidate: 120 },
);
