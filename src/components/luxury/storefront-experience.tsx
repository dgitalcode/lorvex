"use client";

import dynamic from "next/dynamic";
import { PageTransition } from "@/components/luxury/page-transition";
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

export function StorefrontExperience({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <>
      <LuxuryCursor />
      <SearchOverlay locale={locale} dictionary={dictionary} />
      {children}
    </>
  );
}

export function StorefrontPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
