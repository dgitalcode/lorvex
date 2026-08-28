import type { Metadata } from "next";
import { StorefrontImage } from "@/components/shared/storefront-image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { isLocale, getDictionary } from "@/i18n/get-dictionary";
import { localePageMetadata } from "@/lib/page-metadata";
import { missingCatalogMetadata } from "@/lib/seo-indexability";
import { storefrontCopy } from "@/content/storefront-copy";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
} from "@/lib/json-ld";
import { prisma } from "@/lib/prisma";
import { searchProducts } from "@/server/repositories/catalog";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 60;
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const rows = await prisma.collection.findMany({
      select: { slug: true },
    });
    return ["fr", "en", "ar"].flatMap((locale) =>
      rows.map((row) => ({ locale, slug: row.slug })),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: {
      name: true,
      seoTitle: true,
      seoDescription: true,
      description: true,
      coverUrl: true,
    },
  });
  if (!collection || !isLocale(locale)) return missingCatalogMetadata();
  const copy = storefrontCopy(locale);
  const image = collection.coverUrl
    ? collection.coverUrl
    : "/images/lorvex/hero.jpg";
  return localePageMetadata({
    locale,
    path: `/collections/${slug}`,
    title: collection.seoTitle ?? collection.name,
    description:
      collection.seoDescription ??
      collection.description ??
      copy.collectionsDescription,
    image,
  });
}

export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [collection, result] = await Promise.all([
    prisma.collection.findUnique({ where: { slug } }),
    searchProducts({ collection: slug, pageSize: 48 }),
  ]);
  if (!collection) notFound();
  const dictionary = getDictionary(locale);
  const copy = storefrontCopy(locale);
  const crumbs = [
    { name: "LORVEX", path: `/${locale}` },
    { name: dictionary.nav.shop, path: `/${locale}/shop` },
    { name: dictionary.nav.collections, path: `/${locale}/collections` },
    { name: collection.name, path: `/${locale}/collections/${slug}` },
  ];
  return <div className="pb-24 page-pad">
    <JsonLd
      data={buildCollectionPageJsonLd({
        locale,
        slug,
        name: collection.name,
        description: collection.description,
        products: result.products.map((product) => ({
          name: product.name,
          slug: product.slug,
        })),
      })}
    />
    <JsonLd data={buildBreadcrumbListJsonLd(crumbs)} />
    <header className="relative flex min-h-[52vh] items-end overflow-hidden bg-[#171512]">{collection.coverUrl && <StorefrontImage src={collection.coverUrl} alt={collection.name} fill priority fetchPriority="high" sizes="100vw" quality={80} className="object-cover opacity-65" />}<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" /><div className="luxury-container relative pb-14 text-white"><p className="text-[11px] uppercase tracking-[.24em] text-[#d6bd8b]">{collection.isLimited ? copy.collectionLimitedEyebrow : copy.collectionEyebrow}</p><h1 className="mt-3 font-display text-6xl md:text-7xl">{collection.name}</h1>{collection.description && <p className="mt-4 max-w-2xl text-white/75">{collection.description}</p>}</div></header>
    <div className="luxury-container mt-14"><p className="mb-8 text-sm text-muted-foreground">{copy.collectionPieces(result.total)}</p><div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{result.products.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} priority={index < 2} />)}</div></div>
  </div>;
}
