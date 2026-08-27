import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductExperience } from "@/components/product/product-experience";
import type { PdpContext, PdpProduct } from "@/components/product/types";
import type { ProductCardData } from "@/components/storefront/product-card";
import { isLocale } from "@/i18n/get-dictionary";
import {
  getAiRecommendations,
  getCollectionsForProducts,
  getProductBySlug,
  getRecentPurchaseForPopup,
} from "@/server/repositories/catalog";
import { prisma } from "@/lib/prisma";
import { publicPageUrl } from "@/config/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const image = product.ogImage ?? product.media.find((item) => item.type === "IMAGE")?.url;
  const canonical = isLocale(locale) ? publicPageUrl(`/${locale}/product/${slug}`) : undefined;
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? product.description.slice(0, 160),
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription ?? product.description.slice(0, 160),
      images: image ? [image] : [],
      url: canonical,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const toCard = (item: (typeof product.relatedFrom)[number]["related"]): ProductCardData => ({
    id: item.id, name: item.name, slug: item.slug, brandName: item.brand.name,
    imageUrl: item.media[0]?.url ?? item.variants[0]?.imageUrl ?? "/icons/icon.svg",
    price: Number(item.variants[0]?.price ?? item.basePrice),
    compareAtPrice: item.compareAtPrice ? Number(item.compareAtPrice) : null,
    currency: item.currency, isNewArrival: item.isNewArrival,
    isLimitedEdition: item.isLimitedEdition, isBestSeller: item.isBestSeller,
  });

  const frequentlyBought = product.relatedFrom
    .filter((rel) => rel.type === "FREQUENTLY_BOUGHT")
    .map((rel) => toCard(rel.related));
  const related = product.relatedFrom
    .filter((rel) => rel.type === "RELATED")
    .map((rel) => toCard(rel.related));
  const relationIds = product.relatedFrom.map((rel) => rel.relatedId);

  const [aiRecommendations, recentPurchase, faqRows] = await Promise.all([
    getAiRecommendations(product, relationIds, 4),
    getRecentPurchaseForPopup(),
    prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }],
      take: 5,
      select: { id: true, question: true, answer: true },
    }),
  ]);

  const collections = await getCollectionsForProducts(
    [...relationIds, ...aiRecommendations.map((p) => p.id)],
    product.collectionId,
  );

  const data: PdpProduct = {
    id: product.id, name: product.name, slug: product.slug, sku: product.sku,
    brandName: product.brand.name, brandSlug: product.brand.slug,
    collectionName: product.collection?.name ?? null,
    collectionSlug: product.collection?.slug ?? null,
    collectionCoverUrl: product.collection?.coverUrl ?? null,
    description: product.description, shortDescription: product.shortDescription,
    price: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    currency: product.currency, warrantyMonths: product.warrantyMonths,
    movement: product.movement,
    isLimitedEdition: product.isLimitedEdition, isNewArrival: product.isNewArrival,
    images: product.media
      .filter((item) => item.type === "IMAGE")
      .map((item) => ({ id: item.id, type: "IMAGE" as const, url: item.url, alt: item.alt ?? product.name })),
    videos: product.media
      .filter((item) => item.type === "VIDEO")
      .map((item) => ({ id: item.id, type: "VIDEO" as const, url: item.url, alt: item.alt ?? product.name })),
    spinFrames: product.media
      .filter((item) => item.type === "SPIN_360")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.url),
    variants: product.variants.map((v) => ({
      id: v.id, name: v.name, sku: v.sku, color: v.color, dialColor: v.dialColor,
      strapMaterial: v.strapMaterial, caseMaterial: v.caseMaterial,
      caseSizeMm: v.caseSizeMm ? Number(v.caseSizeMm) : null,
      waterResistanceM: v.waterResistanceM,
      price: v.price ? Number(v.price) : null,
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      stock: v.stock, lowStockAt: v.lowStockAt, imageUrl: v.imageUrl,
    })),
    specifications: product.specifications.map((s) => ({ group: s.group, label: s.label, value: s.value })),
    reviews: product.reviews.map((r) => ({
      id: r.id, rating: r.rating, title: r.title, body: r.body, images: r.images,
      author: r.user.name ?? "LORVEX client", verified: r.isVerified,
      createdAt: r.createdAt.toISOString(),
    })),
    questions: product.questions.map((q) => ({
      id: q.id, question: q.question, author: q.user.name ?? "Client",
      createdAt: q.createdAt.toISOString(),
      answers: q.answers.map((a) => ({ id: a.id, answer: a.answer, author: a.user.name ?? "LORVEX", official: a.isOfficial })),
    })),
  };

  const context: PdpContext = {
    locale: localeParam,
    product: data,
    rails: { frequentlyBought, related, aiRecommendations },
    recentPurchase,
  };

  const image = data.images[0]?.url;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    description: product.shortDescription ?? product.description, sku: product.sku,
    image: data.images.map((item) => item.url), brand: { "@type": "Brand", name: product.brand.name },
    offers: { "@type": "Offer", url: publicPageUrl(`/${localeParam}/product/${slug}`), priceCurrency: product.currency, price: data.price, availability: product.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
    ...(product.reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length, reviewCount: product.reviews.length } } : {}),
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    {image && <link rel="preload" as="image" href={image} />}
    <ProductExperience context={context} faqItems={faqRows} collections={collections} />
  </>;
}
