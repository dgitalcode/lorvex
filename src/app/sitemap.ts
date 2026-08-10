import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ select: { slug: true, updatedAt: true } }),
  ]).catch(() => [[], []] as const);
  const [products, collections] = catalog;
  const staticPaths = ["", "/shop", "/collections", "/about", "/contact", "/faq", "/search"];
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of siteConfig.locales) {
    entries.push(...staticPaths.map((path) => ({ url: `${siteConfig.url}/${locale}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "daily" as const : "weekly" as const, priority: path === "" ? 1 : .7 })));
    entries.push(...products.map((product) => ({ url: `${siteConfig.url}/${locale}/product/${product.slug}`, lastModified: product.updatedAt, changeFrequency: "weekly" as const, priority: .8 })));
    entries.push(...collections.map((collection) => ({ url: `${siteConfig.url}/${locale}/collections/${collection.slug}`, lastModified: collection.updatedAt, changeFrequency: "weekly" as const, priority: .7 })));
  }
  return entries;
}
