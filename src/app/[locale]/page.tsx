import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/i18n/get-dictionary";
import { localePageMetadata } from "@/lib/page-metadata";
import { storefrontCopy } from "@/content/storefront-copy";
import {
  HeroSection,
  ProductRail,
  CollectionsSection,
  WhyChooseUs,
  StatsSection,
  BrandStory,
  TestimonialsSection,
  InstagramSection,
  NewsletterSection,
} from "@/components/storefront/home-sections";
import { InfiniteMarquee } from "@/components/luxury/marquee";
import { PersonalizedHomeBlocks } from "@/components/storefront/personalized-home";
import { JsonLd } from "@/components/seo/json-ld";
import { buildSiteGraphJsonLd } from "@/lib/json-ld";
import { getStorefrontSettings } from "@/server/repositories/settings";
import {
  getCachedFeaturedProducts,
  getCachedNewArrivals,
  getCachedBestSellers,
  getCachedLimitedEditions,
  getCachedCollections,
  getCachedTestimonials,
  getCachedHomepageSections,
} from "@/server/repositories/catalog";

export const revalidate = 60;

export function generateStaticParams() {
  return [{ locale: "fr" }, { locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) return {};
  const copy = storefrontCopy(localeParam);
  return localePageMetadata({
    locale: localeParam,
    path: "",
    title: copy.homeTitle,
    description: copy.homeDescription,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const dictionary = getDictionary(locale);
  const copy = storefrontCopy(locale);

  const [
    featured,
    arrivals,
    bestsellers,
    limited,
    collections,
    testimonials,
    sections,
    settings,
  ] = await Promise.all([
    getCachedFeaturedProducts().catch(() => []),
    getCachedNewArrivals().catch(() => []),
    getCachedBestSellers().catch(() => []),
    getCachedLimitedEditions().catch(() => []),
    getCachedCollections().catch(() => []),
    getCachedTestimonials().catch(() => []),
    getCachedHomepageSections().catch(() => []),
    getStorefrontSettings(),
  ]);

  const heroContent = sections.find((s) => s.key === "hero")?.content as
    | {
        title?: string;
        subtitle?: string;
        mediaType?: "image" | "video" | "none";
        videoUrl?: string;
        imageUrl?: string;
        posterUrl?: string;
        ctaPrimaryHref?: string;
        ctaSecondaryHref?: string;
      }
    | undefined;

  const mediaType =
    heroContent?.mediaType ??
    (heroContent?.videoUrl?.trim()
      ? "video"
      : heroContent?.imageUrl?.trim()
        ? "image"
        : "none");

  const hero = {
    ...heroContent,
    mediaType,
    imageUrl:
      mediaType === "none"
        ? "/images/lorvex/hero.jpg"
        : heroContent?.imageUrl?.trim() ||
          heroContent?.posterUrl?.trim() ||
          "/images/lorvex/hero.jpg",
    posterUrl:
      heroContent?.posterUrl?.trim() ||
      heroContent?.imageUrl?.trim() ||
      "/images/lorvex/hero.jpg",
    videoUrl:
      mediaType === "video" ? heroContent?.videoUrl?.trim() || undefined : undefined,
  };

  return (
    <>
      <HeroSection locale={locale} dictionary={dictionary} content={hero} />
      <InfiniteMarquee items={copy.marquee} />
      <PersonalizedHomeBlocks locale={locale} />
      <CollectionsSection
        locale={locale}
        title={dictionary.sections.collections}
        collections={collections}
      />
      <ProductRail
        locale={locale}
        title={dictionary.sections.featured}
        href={`/${locale}/shop`}
        products={featured}
        viewAllLabel={dictionary.common.viewAll}
      />
      <ProductRail
        locale={locale}
        title={dictionary.sections.newArrivals}
        href={`/${locale}/shop?new=1`}
        products={arrivals}
        viewAllLabel={dictionary.common.viewAll}
      />
      <ProductRail
        locale={locale}
        title={dictionary.sections.limited}
        href={`/${locale}/shop?limited=1`}
        products={limited.length ? limited : featured.slice(0, 4)}
        viewAllLabel={dictionary.common.viewAll}
      />
      <ProductRail
        locale={locale}
        title={dictionary.sections.bestSellers}
        href={`/${locale}/shop`}
        products={bestsellers}
        viewAllLabel={dictionary.common.viewAll}
      />
      <WhyChooseUs title={dictionary.sections.whyUs} items={copy.whyUs} />
      <StatsSection title={dictionary.sections.stats} stats={copy.stats} />
      <BrandStory locale={locale} title={dictionary.sections.story} />
      <TestimonialsSection
        title={dictionary.sections.testimonials}
        testimonials={testimonials}
      />
      <InstagramSection title={dictionary.sections.instagram} />
      <NewsletterSection locale={locale} title={dictionary.sections.newsletter} />
      <JsonLd data={buildSiteGraphJsonLd(settings)} />
    </>
  );
}
