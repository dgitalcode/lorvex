import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/i18n/get-dictionary";
import { siteConfig } from "@/config/site";
import { localeAlternates, ogLocale } from "@/lib/i18n-seo";
import { absoluteAssetUrl } from "@/lib/json-ld";
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
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getLimitedEditions,
  getCollections,
  getTestimonials,
  getHomepageSections,
} from "@/server/repositories/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) return {};
  const settings = await getStorefrontSettings();
  const alternates = localeAlternates(localeParam, "");
  return {
    title:
      localeParam === "fr" && settings.tagline
        ? settings.tagline
        : siteConfig.tagline[localeParam],
    description: siteConfig.description[localeParam],
    alternates,
    openGraph: {
      url: alternates.canonical,
      locale: ogLocale(localeParam),
      images: [absoluteAssetUrl("/images/lorvex/hero.jpg")],
    },
  };
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
    getFeaturedProducts(8).catch(() => []),
    getNewArrivals(8).catch(() => []),
    getBestSellers(8).catch(() => []),
    getLimitedEditions(4).catch(() => []),
    getCollections().catch(() => []),
    getTestimonials().catch(() => []),
    getHomepageSections().catch(() => []),
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
      <InfiniteMarquee
        items={[
          "Swiss Movement",
          "Maison LORVEX",
          "Casablanca",
          "Éditions Limitées",
          "Conciergerie Privée",
          "Authenticité Garantie",
        ]}
      />
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
      <WhyChooseUs title={dictionary.sections.whyUs} />
      <StatsSection title={dictionary.sections.stats} />
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
