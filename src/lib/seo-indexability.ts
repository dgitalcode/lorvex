import type { MetadataRoute } from "next";
import { resolvePublicSiteUrl } from "@/config/site";

/** Clean storefront paths that belong in the sitemap (locale prefix added by the sitemap). */
export const INDEXABLE_STATIC_PATHS = [
  "",
  "/shop",
  "/collections",
  "/about",
  "/contact",
  "/faq",
  "/legal/privacy",
  "/legal/terms",
] as const;

export const SITEMAP_EXCLUDED_PATHS = [
  "/search",
  "/cart",
  "/checkout",
  "/account",
  "/auth",
  "/order",
  "/admin",
] as const;

/**
 * Only the clean shop listing is indexable.
 * Default page/sort/availability values are treated as the canonical listing.
 */
export function shopQueryIsIndexable(
  params: Record<string, string | string[] | undefined>,
): boolean {
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null || value === "") continue;
    if (key === "page" && value === "1") continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "availability" && value === "all") continue;
    return false;
  }
  return true;
}

export function buildRobotsDocument(
  origin = resolvePublicSiteUrl(),
): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/*/account/",
          "/*/checkout/",
          "/*/cart",
          "/*/order/",
          "/*/search",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

export function seoOutputHasLeakage(value: string): boolean {
  return (
    value.includes("lorvex-eight") ||
    value.includes("vercel.app") ||
    /https?:\/\/localhost\b/.test(value) ||
    value.includes("127.0.0.1") ||
    /https:\/\/lorvex\.ma\//.test(value)
  );
}
