import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/shared/providers";
import { PwaRegister } from "@/components/shared/pwa-register";
import { siteConfig } from "@/config/site";
import { composeDocumentTitle } from "@/lib/document-title";
import { getDirection, isLocale } from "@/i18n/get-dictionary";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

const sans = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: composeDocumentTitle(siteConfig.tagline.fr),
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description.fr,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "fr_MA",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/icons/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localeHeader = (await headers()).get("x-lorvex-locale") ?? "fr";
  const locale = isLocale(localeHeader) ? localeHeader : "fr";

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
