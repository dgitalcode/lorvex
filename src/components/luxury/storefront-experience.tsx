"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";

const LuxuryCursor = dynamic(
  () =>
    import("@/components/luxury/luxury-cursor").then((mod) => mod.LuxuryCursor),
  { ssr: false },
);

const SearchOverlay = dynamic(
  () =>
    import("@/components/luxury/search-overlay").then((mod) => mod.SearchOverlay),
  { ssr: false },
);

/** Idle luxury chrome only. Must not wrap page HTML or it hydrates the whole storefront. */
export function StorefrontExperience({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <>
      <LuxuryCursor />
      <SearchOverlay locale={locale} dictionary={dictionary} />
    </>
  );
}
