import type { ProductCardData } from "@/components/storefront/product-card";
import type { Locale } from "@/config/site";

export type PdpMedia = {
  id: string;
  type: "IMAGE" | "VIDEO" | "SPIN_360";
  url: string;
  alt: string;
};

export type PdpVariant = {
  id: string;
  name: string;
  sku: string;
  color: string | null;
  dialColor: string | null;
  strapMaterial: string | null;
  caseMaterial: string | null;
  caseSizeMm: number | null;
  waterResistanceM: number | null;
  price: number | null;
  compareAtPrice: number | null;
  stock: number;
  lowStockAt: number;
  imageUrl: string | null;
};

export type PdpSpec = {
  group: string;
  label: string;
  value: string;
};

export type PdpReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  images: string[];
  author: string;
  verified: boolean;
  createdAt: string;
};

export type PdpQuestion = {
  id: string;
  question: string;
  author: string;
  createdAt: string;
  answers: {
    id: string;
    answer: string;
    author: string;
    official: boolean;
  }[];
};

export type PdpProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brandName: string;
  brandSlug: string;
  collectionName: string | null;
  collectionSlug: string | null;
  collectionCoverUrl: string | null;
  description: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  warrantyMonths: number;
  movement: string;
  isLimitedEdition: boolean;
  isNewArrival: boolean;
  images: PdpMedia[];
  videos: PdpMedia[];
  spinFrames: string[];
  variants: PdpVariant[];
  specifications: PdpSpec[];
  reviews: PdpReview[];
  questions: PdpQuestion[];
};

export type RecentPurchase = {
  firstName: string;
  city: string;
  productName: string;
  minutesAgo: number;
} | null;

export type PdpRails = {
  frequentlyBought: ProductCardData[];
  related: ProductCardData[];
  aiRecommendations: ProductCardData[];
};

export type PdpContext = {
  locale: Locale;
  product: PdpProduct;
  rails: PdpRails;
  recentPurchase: RecentPurchase;
};
