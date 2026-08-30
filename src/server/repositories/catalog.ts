import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ProductCardData } from "@/components/storefront/product-card";
import { Prisma } from "@prisma/client";

function toCard(
  product: {
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
    variants: { price: Prisma.Decimal | null; imageUrl: string | null; id: string; name: string; stock: number }[];
  },
): ProductCardData {
  const variant = product.variants[0];
  const variantPrice = variant?.price;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brand.name,
    imageUrl:
      product.media[0]?.url ??
      variant?.imageUrl ??
      "/images/lorvex/watch-01.jpg",

    price: Number(variantPrice ?? product.basePrice),
    compareAtPrice: product.compareAtPrice
      ? Number(product.compareAtPrice)
      : null,
    currency: product.currency,
    isNewArrival: product.isNewArrival,
    isLimitedEdition: product.isLimitedEdition,
    isBestSeller: product.isBestSeller,
    variantId: variant?.id ?? null,
    variantName: variant?.name ?? null,
    stock: variant?.stock ?? 0,
  };
}

const productCardInclude = {
  brand: { select: { name: true } },
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

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isFeatured: true },
    include: productCardInclude,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return products.map(toCard);
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isNewArrival: true },
    include: productCardInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return products.map(toCard);
}

export async function getBestSellers(limit = 8): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isBestSeller: true },
    include: productCardInclude,
    take: limit,
  });
  return products.map(toCard);
}

export async function getLimitedEditions(limit = 8): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isLimitedEdition: true },
    include: productCardInclude,
    take: limit,
  });
  return products.map(toCard);
}

export async function getCollections() {
  return prisma.collection.findMany({
    where: { isFeatured: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getBrands() {
  return prisma.brand.findMany({
    where: { isFeatured: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getHomepageSections() {
  return prisma.homepageSection.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getTestimonials() {
  return prisma.testimonial.findMany({
    where: { isFeatured: true },
    orderBy: { sortOrder: "asc" },
  });
}

export const getCachedCollections = unstable_cache(
  getCollections,
  ["storefront-collections-featured"],
  { revalidate: 60 },
);

export const getCachedHomepageSections = unstable_cache(
  getHomepageSections,
  ["storefront-homepage-sections"],
  { revalidate: 60 },
);

export const getCachedTestimonials = unstable_cache(
  getTestimonials,
  ["storefront-testimonials"],
  { revalidate: 120 },
);

export async function getAnnouncement() {
  return prisma.announcementBar.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Short-lived cache: announcement is not purchasable inventory. */
export const getCachedAnnouncement = unstable_cache(
  getAnnouncement,
  ["storefront-announcement"],
  { revalidate: 120 },
);

export const getCachedFeaturedProducts = unstable_cache(
  () => getFeaturedProducts(8),
  ["storefront-featured-8"],
  { revalidate: 60 },
);

export const getCachedNewArrivals = unstable_cache(
  () => getNewArrivals(8),
  ["storefront-arrivals-8"],
  { revalidate: 60 },
);

export const getCachedBestSellers = unstable_cache(
  () => getBestSellers(8),
  ["storefront-bestsellers-8"],
  { revalidate: 60 },
);

export const getCachedLimitedEditions = unstable_cache(
  () => getLimitedEditions(4),
  ["storefront-limited-4"],
  { revalidate: 60 },
);

export type ShopFilters = {
  brand?: string;
  collection?: string;
  gender?: string;
  movement?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: "in_stock" | "all";
  caseMaterial?: string;
  strapMaterial?: string;
  dialColor?: string;
  waterResistance?: number;
  q?: string;
  new?: boolean;
  limited?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  pageSize?: number;
};

async function searchProductsUncached(filters: ShopFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(filters.brand
      ? { brand: { slug: filters.brand } }
      : {}),
    ...(filters.collection
      ? { collection: { slug: filters.collection } }
      : {}),
    ...(filters.gender
      ? { gender: filters.gender as Prisma.EnumGenderFilter["equals"] }
      : {}),
    ...(filters.movement
      ? { movement: filters.movement as Prisma.EnumMovementTypeFilter["equals"] }
      : {}),
    ...(filters.new ? { isNewArrival: true } : {}),
    ...(filters.limited ? { isLimitedEdition: true } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { shortDescription: { contains: filters.q, mode: "insensitive" } },
            { sku: { contains: filters.q, mode: "insensitive" } },
            { brand: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(filters.minPrice || filters.maxPrice
      ? {
          basePrice: {
            ...(filters.minPrice ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(filters.availability === "in_stock"
      ? { variants: { some: { stock: { gt: 0 } } } }
      : {}),
    ...(filters.caseMaterial ||
    filters.strapMaterial ||
    filters.dialColor ||
    filters.color ||
    filters.waterResistance
      ? {
          variants: {
            some: {
              ...(filters.caseMaterial
                ? {
                    caseMaterial: {
                      contains: filters.caseMaterial,
                      mode: "insensitive",
                    },
                  }
                : {}),
              ...(filters.strapMaterial
                ? {
                    strapMaterial: {
                      contains: filters.strapMaterial,
                      mode: "insensitive",
                    },
                  }
                : {}),
              ...(filters.dialColor || filters.color
                ? {
                    dialColor: {
                      contains: filters.dialColor ?? filters.color,
                      mode: "insensitive",
                    },
                  }
                : {}),
              ...(filters.waterResistance
                ? { waterResistanceM: { gte: filters.waterResistance } }
                : {}),
            },
          },
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { basePrice: "asc" }
      : filters.sort === "price_desc"
        ? { basePrice: "desc" }
        : filters.sort === "name"
          ? { name: "asc" }
          : { publishedAt: "desc" };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productCardInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    products: products.map(toCard),
  };
}

export const searchProducts = unstable_cache(
  searchProductsUncached,
  ["storefront-search-products"],
  { revalidate: 60 },
);

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      brand: true,
      collection: true,
      category: true,
      media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }] },
      specifications: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      questions: {
        where: { isApproved: true },
        include: {
          answers: {
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
          user: { select: { name: true } },
        },
        take: 20,
      },
      relatedFrom: {
        include: {
          related: { include: productCardInclude },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getProductCardsByIds(
  ids: string[],
): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    include: productCardInclude,
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map(toCard);
}

/**
 * Content-based recommendations: scores active products by brand,
 * collection, movement and price proximity relative to the source piece.
 */
export async function getAiRecommendations(
  product: {
    id: string;
    brandId: string;
    collectionId: string | null;
    movement: string;
    basePrice: Prisma.Decimal;
  },
  excludeIds: string[],
  limit = 4,
): Promise<ProductCardData[]> {
  const { getHybridRecommendations } = await import(
    "@/server/services/recommendations"
  );
  return getHybridRecommendations({
    sourceProductId: product.id,
    excludeIds,
    limit,
  });
}

export async function getCollectionsForProducts(
  productIds: string[],
  includeCollectionId?: string | null,
) {
  return prisma.collection.findMany({
    where: {
      OR: [
        { products: { some: { id: { in: productIds } } } },
        ...(includeCollectionId ? [{ id: includeCollectionId }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverUrl: true,
    },
    take: 3,
  });
}

export async function getRecentPurchaseForPopup() {
  const item = await prisma.orderItem.findFirst({
    where: {
      order: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    },
    orderBy: { order: { createdAt: "desc" } },
    include: {
      order: {
        select: {
          createdAt: true,
          user: { select: { firstName: true, name: true } },
          shippingAddress: { select: { city: true } },
        },
      },
      product: { select: { name: true } },
    },
  });
  if (!item) return null;

  const firstName =
    item.order.user?.firstName ??
    item.order.user?.name?.split(" ")[0] ??
    "Un client";
  const minutesAgo = Math.max(
    1,
    Math.round((Date.now() - item.order.createdAt.getTime()) / 60_000),
  );
  return {
    firstName,
    city: item.order.shippingAddress?.city ?? "Casablanca",
    productName: item.product.name,
    // Keep the social proof plausible even for older seed orders.
    minutesAgo: Math.min(minutesAgo, 59),
  };
}

export const getCachedRecentPurchase = unstable_cache(
  getRecentPurchaseForPopup,
  ["storefront-recent-purchase-popup"],
  { revalidate: 120 },
);

export async function getFilterFacets() {
  const [brands, collections, price] = await Promise.all([
    prisma.brand.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.collection.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.aggregate({
      where: { status: "ACTIVE" },
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  return {
    brands,
    collections,
    minPrice: Number(price._min.basePrice ?? 0),
    maxPrice: Number(price._max.basePrice ?? 0),
  };
}

export const getCachedFilterFacets = unstable_cache(
  getFilterFacets,
  ["storefront-filter-facets"],
  { revalidate: 60 },
);
