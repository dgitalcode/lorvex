"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/config/site";

const MarketingPopupHost = dynamic(
  () =>
    import("@/components/storefront/marketing-popup-host").then(
      (mod) => mod.MarketingPopupHost,
    ),
  { ssr: false },
);

export function MarketingPopupLoader({ locale }: { locale: Locale }) {
  return <MarketingPopupHost locale={locale} />;
}
