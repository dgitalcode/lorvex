import type { Locale } from "@/config/site";
import { publicPageUrl, siteConfig } from "@/config/site";
import type { StorefrontSettings } from "@/lib/storefront-settings";
import { localeCanonical } from "@/lib/i18n-seo";

export type JsonLd = Record<string, unknown>;

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function absoluteAssetUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return publicPageUrl(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
}

const PLACEHOLDER_SOCIAL = new Set<string>(Object.values(siteConfig.social));

export function verifiedSameAs(settings: StorefrontSettings): string[] {
  return [
    settings.socialInstagram,
    settings.socialFacebook,
    settings.socialTikTok,
    settings.socialYoutube,
  ].filter((url): url is string => {
    if (!url?.trim()) return false;
    const value = url.trim();
    if (PLACEHOLDER_SOCIAL.has(value)) return false;
    return /^https?:\/\//i.test(value);
  });
}

export function gtinFromBarcode(barcode: string | null | undefined): string | undefined {
  if (!barcode) return undefined;
  const digits = barcode.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return undefined;
  if (digits.replace(/0/g, "").length === 0) return undefined;
  return digits;
}

export function offerAvailability(inStock: boolean): string {
  return inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

export function sellingOffer(input: {
  variants: { price: number | null; stock: number }[];
  basePrice: number;
}): { price: number; inStock: boolean } {
  const selected =
    input.variants.find((variant) => variant.stock > 0) ?? input.variants[0];
  const price =
    selected?.price != null && Number.isFinite(selected.price)
      ? selected.price
      : input.basePrice;
  const inStock = input.variants.some((variant) => variant.stock > 0);
  return { price, inStock };
}

export function buildOrganizationJsonLd(settings: StorefrontSettings): JsonLd {
  const sameAs = verifiedSameAs(settings);
  const logo = absoluteAssetUrl(settings.logoUrl || "/icons/icon.svg");
  return {
    "@type": "Organization",
    "@id": `${publicPageUrl("/")}/#organization`,
    name: settings.siteName,
    url: publicPageUrl("/"),
    logo,
    email: settings.supportEmail,
    telephone: settings.supportPhone,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function buildWebSiteJsonLd(settings: StorefrontSettings): JsonLd {
  return {
    "@type": "WebSite",
    "@id": `${publicPageUrl("/")}/#website`,
    name: settings.siteName,
    url: publicPageUrl("/"),
    publisher: { "@id": `${publicPageUrl("/")}/#organization` },
  };
}

export function buildSiteGraphJsonLd(settings: StorefrontSettings): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationJsonLd(settings), buildWebSiteJsonLd(settings)],
  };
}

export function buildBreadcrumbListJsonLd(
  items: { name: string; path: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: publicPageUrl(item.path),
    })),
  };
}

export function buildProductJsonLd(input: {
  locale: Locale;
  slug: string;
  name: string;
  description: string;
  sku: string;
  brandName: string;
  currency: string;
  images: string[];
  barcode?: string | null;
  variants: { price: number | null; stock: number }[];
  basePrice: number;
  reviews: {
    rating: number;
    body: string;
    title?: string | null;
    author?: string | null;
  }[];
}): JsonLd {
  const url = localeCanonical(input.locale, `/product/${input.slug}`);
  const { price, inStock } = sellingOffer({
    variants: input.variants,
    basePrice: input.basePrice,
  });
  const images = input.images.map(absoluteAssetUrl).filter(Boolean);
  const gtin = gtinFromBarcode(input.barcode);
  const namedReviews = input.reviews.filter(
    (review) => review.author?.trim() && review.body.trim() && review.rating >= 1,
  );

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    url,
    brand: { "@type": "Brand", name: input.brandName },
    offers: {
      "@type": "Offer",
      url,
      price: String(price),
      priceCurrency: input.currency,
      availability: offerAvailability(inStock),
    },
  };

  if (images.length) jsonLd.image = images;
  if (gtin) jsonLd.gtin = gtin;

  if (input.reviews.length) {
    const ratingValue =
      input.reviews.reduce((sum, review) => sum + review.rating, 0) /
      input.reviews.length;
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue.toFixed(2)),
      reviewCount: input.reviews.length,
    };
  }

  if (namedReviews.length) {
    jsonLd.review = namedReviews.map((review) => ({
      "@type": "Review",
      reviewBody: review.body,
      ...(review.title?.trim() ? { name: review.title.trim() } : {}),
      author: { "@type": "Person", name: review.author!.trim() },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
  }

  return jsonLd;
}

export function buildCollectionPageJsonLd(input: {
  locale: Locale;
  slug: string;
  name: string;
  description?: string | null;
  products: { name: string; slug: string }[];
}): JsonLd {
  const url = localeCanonical(input.locale, `/collections/${input.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    url,
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.products.length,
      itemListElement: input.products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: localeCanonical(input.locale, `/product/${product.slug}`),
        name: product.name,
      })),
    },
  };
}

export function buildFaqPageJsonLd(
  items: { question: string; answer: string }[],
): JsonLd | null {
  const visible = items.filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  if (!visible.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: visible.map((item) => ({
      "@type": "Question",
      name: item.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer.trim(),
      },
    })),
  };
}
