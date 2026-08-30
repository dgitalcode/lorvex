import type { Metadata } from "next";
import { PRODUCTION_SITE_ORIGIN } from "@/config/site";

/** Explicit LORVEX icons so crawlers do not fall back to Vercel /favicon.ico. */
export const lorvexMetadataIcons = {
  icon: [
    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    { url: "/icons/icon.svg", type: "image/svg+xml" },
    { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
    { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  ],
  shortcut: [{ url: "/favicon.ico" }],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
} satisfies NonNullable<Metadata["icons"]>;

export function brandIconUrls(): string[] {
  return [
    "/favicon.ico",
    "/icons/icon.svg",
    "/icons/icon-32.png",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/apple-touch-icon.png",
  ];
}

export const brandOgImage = `${PRODUCTION_SITE_ORIGIN}/images/lorvex/hero.jpg`;
