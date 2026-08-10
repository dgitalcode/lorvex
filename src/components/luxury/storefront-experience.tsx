"use client";

import { GsapProvider } from "@/components/luxury/gsap-provider";
import { LoadingScreen } from "@/components/luxury/loading-screen";
import { LuxuryCursor } from "@/components/luxury/luxury-cursor";
import { PageTransition } from "@/components/luxury/page-transition";
import { SearchOverlay } from "@/components/luxury/search-overlay";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";

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
      <LoadingScreen />
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
