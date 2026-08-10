import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/i18n/get-dictionary";
import { siteConfig } from "@/config/site";
import {
  HeroSection,
  ProductRail,
  HorizontalProductRail,
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
  return {
    title: siteConfig.tagline[localeParam],
    description: siteConfig.description[localeParam],
    alternates: {
      canonical: `/${localeParam}`,
      languages: {
        fr: "/fr",
        en: "/en",
        ar: "/ar",
      },
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
  ] = await Promise.all([
    getFeaturedProducts(8).catch(() => []),
    getNewArrivals(8).catch(() => []),
    getBestSellers(8).catch(() => []),
    getLimitedEditions(4).catch(() => []),
    getCollections().catch(() => []),
    getTestimonials().catch(() => []),
    getHomepageSections().catch(() => []),
  ]);

  const heroContent = sections.find((s) => s.key === "hero")?.content as
    | {
        title?: string;
        subtitle?: string;
        videoUrl?: string;
        imageUrl?: string;
        ctaPrimaryHref?: string;
        ctaSecondaryHref?: string;
      }
    | undefined;

  const hero = {
    ...heroContent,
    imageUrl: heroContent?.imageUrl || "/images/lorvex/hero.jpg",
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
      <HorizontalProductRail
        locale={locale}
        title={dictionary.sections.limited}
        products={limited.length ? limited : featured.slice(0, 4)}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description[locale],
            address: {
              "@type": "PostalAddress",
              addressCountry: "MA",
              addressLocality: "Casablanca",
            },
          }),
        }}
      />
    </>
  );
}
