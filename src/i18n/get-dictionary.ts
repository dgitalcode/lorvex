import { dictionaries, type Dictionary } from "@/i18n/dictionaries";
import { siteConfig, type Locale } from "@/config/site";

export function isLocale(value: string): value is Locale {
  return (siteConfig.locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
