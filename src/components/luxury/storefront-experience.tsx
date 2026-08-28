"use client";

import dynamic from "next/dynamic";
import { GsapProvider } from "@/components/luxury/gsap-provider";
import { PageTransition } from "@/components/luxury/page-transition";
import { SearchOverlay } from "@/components/luxury/search-overlay";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";

const LuxuryCursor = dynamic(
  () =>
    import("@/components/luxury/luxury-cursor").then((mod) => mod.LuxuryCursor),
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
    <GsapProvider>
      <LuxuryCursor />
      <SearchOverlay locale={locale} dictionary={dictionary} />
      {children}
    </GsapProvider>
  );
}

export function StorefrontPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
