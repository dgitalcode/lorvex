import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";
import { SiteSettingsForm } from "@/components/admin/settings/site-settings-form";

export const metadata = { title: "Site settings" };

export default async function AdminSettingsPage() {
  await requirePermission("system.manage");

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  return (
    <SiteSettingsForm
      settings={{
        siteName: settings.siteName,
        tagline: settings.tagline,
        logoUrl: settings.logoUrl,
        logoDarkUrl: settings.logoDarkUrl,
        faviconUrl: settings.faviconUrl,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        whatsappNumber: settings.whatsappNumber,
        socialInstagram: settings.socialInstagram,
        socialFacebook: settings.socialFacebook,
        socialTikTok: settings.socialTikTok,
        socialYoutube: settings.socialYoutube,
        defaultLocale: settings.defaultLocale as "fr" | "en" | "ar",
        defaultCurrency: settings.defaultCurrency,
        enableGuestCheckout: settings.enableGuestCheckout,
        enableReviews: settings.enableReviews,
        maintenanceMode: settings.maintenanceMode,
      }}
    />
  );
}
