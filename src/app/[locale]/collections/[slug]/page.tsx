import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { isLocale } from "@/i18n/get-dictionary";
import { localeAlternates, ogLocale } from "@/lib/i18n-seo";
import { prisma } from "@/lib/prisma";
import { searchProducts } from "@/server/repositories/catalog";

type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = await prisma.collection.findUnique({ where: { slug }, select: { name: true, seoTitle: true, seoDescription: true, description: true } });
  if (!collection || !isLocale(locale)) return {};
  const alternates = localeAlternates(locale, `/collections/${slug}`);
  return {
    title: collection.seoTitle ?? collection.name,
    description: collection.seoDescription ?? collection.description,
    alternates,
    openGraph: { url: alternates.canonical, locale: ogLocale(locale) },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const collection = await prisma.collection.findUnique({ where: { slug } });
  if (!collection) notFound();
  const result = await searchProducts({ collection: slug, pageSize: 48 });
  return <div className="pb-24 page-pad">
    <header className="relative flex min-h-[52vh] items-end overflow-hidden bg-[#171512]">{collection.coverUrl && <Image src={collection.coverUrl} alt={collection.name} fill priority className="object-cover opacity-65" />}<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" /><div className="luxury-container relative pb-14 text-white"><p className="text-[11px] uppercase tracking-[.24em] text-[#d6bd8b]">{collection.isLimited ? "Limited collection" : "LORVEX collection"}</p><h1 className="mt-3 font-display text-6xl md:text-7xl">{collection.name}</h1>{collection.description && <p className="mt-4 max-w-2xl text-white/75">{collection.description}</p>}</div></header>
    <div className="luxury-container mt-14"><p className="mb-8 text-sm text-muted-foreground">{result.total} timepieces</p><div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{result.products.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div></div>
  </div>;
}
