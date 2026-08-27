import type { Metadata } from "next";
import type { Locale } from "@/config/site";
import { localeAlternates, ogLocale } from "@/lib/i18n-seo";
import { absoluteAssetUrl } from "@/lib/json-ld";
import { composeDocumentTitle } from "@/lib/document-title";

const DEFAULT_OG_IMAGE = "/images/lorvex/hero.jpg";

export function localePageMetadata(input: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string | null;
  robots?: Metadata["robots"];
}): Metadata {
  const alternates = localeAlternates(input.locale, input.path);
  const title = composeDocumentTitle(input.title);
  const image = absoluteAssetUrl(input.image?.trim() || DEFAULT_OG_IMAGE);
  return {
    title: { absolute: title },
    description: input.description,
    alternates,
    robots: input.robots,
    openGraph: {
      title,
      description: input.description,
      url: alternates.canonical,
      locale: ogLocale(input.locale),
      images: [image],
    },
  };
}
