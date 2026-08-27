import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicPageUrl, siteConfig } from "@/config/site";
import { hreflangLanguages } from "@/lib/i18n-seo";
import { INDEXABLE_STATIC_PATHS } from "@/lib/seo-indexability";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      select: { slug: true, updatedAt: true },
    }),
  ]).catch(() => [[], []] as const);
  const [products, collections] = catalog;
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of siteConfig.locales) {
    entries.push(
      ...INDEXABLE_STATIC_PATHS.map((path) => ({
        url: publicPageUrl(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
        priority: path === "" ? 1 : 0.7,
        alternates: { languages: hreflangLanguages(path) },
      })),
    );
    entries.push(
      ...products.map((product) => ({
        url: publicPageUrl(`/${locale}/product/${product.slug}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: { languages: hreflangLanguages(`/product/${product.slug}`) },
      })),
    );
    entries.push(
      ...collections.map((collection) => ({
        url: publicPageUrl(`/${locale}/collections/${collection.slug}`),
        lastModified: collection.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: { languages: hreflangLanguages(`/collections/${collection.slug}`) },
      })),
    );
  }
  return entries;
}
