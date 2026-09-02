import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { localePageMetadata } from "@/lib/page-metadata";
import { storefrontCopy } from "@/content/storefront-copy";
import { getStorefrontSettings } from "@/server/repositories/settings";
import { ContactForm } from "@/components/storefront/contact-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = storefrontCopy(locale);
  return localePageMetadata({
    locale,
    path: "/contact",
    title: copy.contactTitle,
    description: copy.contactDescription,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const settings = await getStorefrontSettings();
  const copy = storefrontCopy(locale);

  return (
    <div className="luxury-container pb-24 page-pad">
      <div className="grid gap-14 lg:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[.24em] text-accent">
            {copy.contactEyebrow}
          </p>
          <h1 className="mt-3 font-display text-6xl">{copy.contactH1}</h1>
          <p className="mt-5 max-w-lg leading-7 text-muted-foreground">
            {copy.contactLead}
          </p>
          <div className="mt-10 space-y-5 text-sm">
            <a
              href={`mailto:${settings.supportEmail}`}
              className="flex items-center gap-3 hover:text-accent"
            >
              <Mail className="h-4 w-4" />
              {settings.supportEmail}
            </a>
            <a
              href={`tel:${settings.supportPhone.replaceAll(" ", "")}`}
              className="flex items-center gap-3 hover:text-accent"
            >
              <Phone className="h-4 w-4" />
              {settings.supportPhone}
            </a>
            <p className="flex items-center gap-3">
              <MapPin className="h-4 w-4" />
              {copy.contactCity}
            </p>
          </div>
        </div>
        <ContactForm locale={locale} />
      </div>
    </div>
  );
}
