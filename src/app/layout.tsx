import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Providers } from "@/components/shared/providers";
import { PwaRegister } from "@/components/shared/pwa-register";
import { siteConfig } from "@/config/site";
import { composeDocumentTitle } from "@/lib/document-title";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

const sans = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      dir="ltr"
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
