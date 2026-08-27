import type { Locale } from "@/config/site";
import { publicPageUrl, siteConfig } from "@/config/site";

/** BCP 47 hreflang targets. URL prefixes remain /fr /en /ar. */
export const HREFLANG_BY_LOCALE = {
  fr: "fr-MA",
  en: "en-MA",
  ar: "ar-MA",
} as const satisfies Record<Locale, string>;

export function normalizePathAfterLocale(pathAfterLocale: string): string {
  if (!pathAfterLocale || pathAfterLocale === "/") return "";
  const withSlash = pathAfterLocale.startsWith("/")
    ? pathAfterLocale
    : `/${pathAfterLocale}`;
  return withSlash.replace(/\/$/, "");
}

export function hreflangLanguages(
  pathAfterLocale: string,
): Record<string, string> {
  const suffix = normalizePathAfterLocale(pathAfterLocale);
  const languages: Record<string, string> = {
    "x-default": publicPageUrl(`/${siteConfig.localeDefault}${suffix}`),
  };
  for (const locale of siteConfig.locales) {
    languages[HREFLANG_BY_LOCALE[locale]] = publicPageUrl(
      `/${locale}${suffix}`,
    );
  }
  return languages;
}

export function localeCanonical(locale: Locale, pathAfterLocale: string): string {
  const suffix = normalizePathAfterLocale(pathAfterLocale);
  return publicPageUrl(`/${locale}${suffix}`);
}

export function localeAlternates(locale: Locale, pathAfterLocale: string) {
  return {
    canonical: localeCanonical(locale, pathAfterLocale),
    languages: hreflangLanguages(pathAfterLocale),
  };
}

export function ogLocale(locale: Locale): string {
  return HREFLANG_BY_LOCALE[locale].replace("-", "_");
}

export function swapLocalePath(
  pathname: string,
  from: Locale,
  to: Locale,
): string {
  if (pathname === `/${from}` || pathname.startsWith(`/${from}/`)) {
    return `/${to}${pathname.slice(from.length + 1)}`;
  }
  return `/${to}`;
}

const NO_HREFLANG_PREFIXES = [
  "/search",
  "/cart",
  "/checkout",
  "/account",
  "/auth",
  "/order",
] as const;

export function isHreflangPath(pathAfterLocale: string): boolean {
  const suffix = normalizePathAfterLocale(pathAfterLocale);
  return !NO_HREFLANG_PREFIXES.some(
    (prefix) => suffix === prefix || suffix.startsWith(`${prefix}/`),
  );
}
