import { siteConfig } from "@/config/site";
import type { SiteSettings } from "@prisma/client";

/** Canonical storefront settings resolved from DB with static fallbacks. */
export type StorefrontSettings = {
  siteName: string;
  tagline: string | null;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTikTok: string;
  socialYoutube: string | null;
  defaultLocale: string;
  defaultCurrency: string;
  enableGuestCheckout: boolean;
  enableReviews: boolean;
  maintenanceMode: boolean;
};

export function resolveStorefrontSettings(
  row: SiteSettings | null | undefined,
): StorefrontSettings {
  return {
    siteName: row?.siteName?.trim() || siteConfig.name,
    tagline: row?.tagline?.trim() || null,
    supportEmail: row?.supportEmail?.trim() || siteConfig.supportEmail,
    supportPhone: row?.supportPhone?.trim() || siteConfig.supportPhone,
    whatsappNumber: row?.whatsappNumber?.trim() || siteConfig.whatsapp,
    socialInstagram:
      row?.socialInstagram?.trim() || siteConfig.social.instagram,
    socialFacebook: row?.socialFacebook?.trim() || siteConfig.social.facebook,
    socialTikTok: row?.socialTikTok?.trim() || siteConfig.social.tiktok,
    socialYoutube: row?.socialYoutube?.trim() || null,
    defaultLocale: row?.defaultLocale || siteConfig.localeDefault,
    defaultCurrency: row?.defaultCurrency || siteConfig.currencyDefault,
    enableGuestCheckout: row?.enableGuestCheckout ?? true,
    enableReviews: row?.enableReviews ?? true,
    maintenanceMode: row?.maintenanceMode ?? false,
  };
}
