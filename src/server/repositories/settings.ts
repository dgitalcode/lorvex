import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  resolveStorefrontSettings,
  type StorefrontSettings,
} from "@/lib/storefront-settings";

export const SITE_SETTINGS_TAG = "site-settings";

async function loadSiteSettings(): Promise<StorefrontSettings> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    return resolveStorefrontSettings(row);
  } catch {
    return resolveStorefrontSettings(null);
  }
}

/** Cached canonical site settings for the storefront. */
export const getStorefrontSettings = unstable_cache(
  loadSiteSettings,
  ["storefront-site-settings"],
  { tags: [SITE_SETTINGS_TAG], revalidate: 300 },
);
