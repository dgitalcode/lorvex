export const siteConfig = {
  name: "LORVEX",
  tagline: {
    fr: "L'horlogerie de luxe au Maroc",
    en: "Luxury watchmaking in Morocco",
    ar: "صناعة الساعات الفاخرة في المغرب",
  },
  description: {
    fr: "LORVEX est la maison marocaine de référence pour les montres de prestige. Sélection exclusive, authenticité garantie, expérience d'achat inimitable.",
    en: "LORVEX is Morocco's definitive house for prestige watches. Exclusive selection, guaranteed authenticity, an unforgettable buying experience.",
    ar: "لورفكس هي الدار المغربية المرجعية للساعات الفاخرة. تشكيلة حصرية، أصالة مضمونة، وتجربة شراء لا تُنسى.",
  },
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  localeDefault: "fr" as const,
  locales: ["fr", "en", "ar"] as const,
  currencyDefault: "MAD",
  currencies: ["MAD", "EUR", "USD"] as const,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "212600000000",
  supportEmail: "concierge@lorvex.ma",
  supportPhone: "+212 5 22 00 00 00",
  social: {
    instagram: "https://instagram.com/lorvex",
    facebook: "https://facebook.com/lorvex",
    tiktok: "https://tiktok.com/@lorvex",
  },
} as const;

export type Locale = (typeof siteConfig.locales)[number];
export type Currency = (typeof siteConfig.currencies)[number];
