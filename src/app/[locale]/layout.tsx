import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { isLocale, getDictionary, getDirection } from "@/i18n/get-dictionary";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { getCachedAnnouncement } from "@/server/repositories/catalog";
import { getStorefrontSettings } from "@/server/repositories/settings";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { StorefrontExperience } from "@/components/luxury/storefront-experience";
import { AnalyticsTracker } from "@/components/shared/analytics-tracker";
import { RoutePrefetcher } from "@/components/shared/route-prefetcher";
import { MarketingPopupLoader } from "@/components/storefront/marketing-popup-loader";

export function generateStaticParams() {
  return [{ locale: "fr" }, { locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const dictionary = getDictionary(locale);
  const direction = getDirection(locale);
  const [announcement, settings] = await Promise.all([
    getCachedAnnouncement().catch(() => null),
    getStorefrontSettings(),
  ]);
  const announcementMessage = announcement?.message;
  const announcementHeight = announcementMessage ? "2.25rem" : "0rem";

  const skipLabel =
    locale === "ar"
      ? "تخطى إلى المحتوى"
      : locale === "en"
        ? "Skip to content"
        : "Aller au contenu";

  return (
    <div
      lang={locale}
      dir={direction}
      className="flex min-h-dvh flex-col"
      style={
        {
          "--announcement-height": announcementHeight,
        } as CSSProperties
      }
    >
      <a href="#main-content" className="skip-link">
        {skipLabel}
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(locale)};document.documentElement.dir=${JSON.stringify(direction)};`,
        }}
      />
      <StorefrontExperience locale={locale} dictionary={dictionary} />
      <AnalyticsTracker />
      <RoutePrefetcher locale={locale} />
      <MarketingPopupLoader locale={locale} />
      <SiteHeader
        locale={locale}
        dictionary={dictionary}
        announcement={announcementMessage}
        settings={settings}
      />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter
        locale={locale}
        dictionary={dictionary}
        settings={settings}
      />
      <WhatsAppButton
        locale={locale}
        whatsappNumber={settings.whatsappNumber}
      />
    </div>
  );
}
