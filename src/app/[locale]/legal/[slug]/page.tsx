import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { siteConfig, type Locale } from "@/config/site";
import { localeAlternates, ogLocale } from "@/lib/i18n-seo";
import { absoluteAssetUrl } from "@/lib/json-ld";
import {
  getLegalDocument,
  isLegalSlug,
  LEGAL_SLUGS,
  type LegalSlug,
} from "@/content/legal";
import { getStorefrontSettings } from "@/server/repositories/settings";
import { LegalDocumentView } from "@/components/storefront/legal-document-view";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const params: { locale: Locale; slug: LegalSlug }[] = [];
  for (const locale of siteConfig.locales) {
    for (const slug of LEGAL_SLUGS) {
      params.push({ locale, slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam) || !isLegalSlug(slug)) notFound();

  const settings = await getStorefrontSettings();
  const document = getLegalDocument(localeParam, slug, {
    siteName: settings.siteName,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
  });

  const alternates = localeAlternates(localeParam, `/legal/${slug}`);

  return {
    title: document.title,
    description: document.description,
    alternates,
    openGraph: {
      title: `${document.title} · ${settings.siteName}`,
      description: document.description,
      url: alternates.canonical,
      siteName: settings.siteName,
      locale: ogLocale(localeParam),
      type: "website",
      images: [absoluteAssetUrl("/images/lorvex/hero.jpg")],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LegalPage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam) || !isLegalSlug(slug)) notFound();

  const settings = await getStorefrontSettings();
  const document = getLegalDocument(localeParam, slug, {
    siteName: settings.siteName,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
  });

  const alternateSlug = slug === "privacy" ? "terms" : "privacy";
  const alternateLabel =
    localeParam === "ar"
      ? alternateSlug === "privacy"
        ? "سياسة الخصوصية"
        : "الشروط والأحكام"
      : localeParam === "en"
        ? alternateSlug === "privacy"
          ? "Privacy Policy"
          : "Terms & Conditions"
        : alternateSlug === "privacy"
          ? "Politique de confidentialité"
          : "Conditions générales";

  const updatedAt = new Intl.DateTimeFormat(
    localeParam === "ar" ? "ar-MA" : localeParam === "en" ? "en-GB" : "fr-MA",
    { year: "numeric", month: "long", day: "numeric" },
  ).format(new Date("2026-08-12"));

  return (
    <LegalDocumentView
      locale={localeParam}
      legal={document}
      updatedAt={updatedAt}
      alternateSlug={alternateSlug}
      alternateLabel={alternateLabel}
    />
  );
}
