import { publicPageUrl } from "@/config/site";

export function formatPrice(
  amount: number | string,
  currency: string = "MAD",
  locale: string = "fr-MA",
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "MAD" ? 0 : 2,
  }).format(value);
}

export function formatDate(
  date: Date | string,
  locale: string = "fr-MA",
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

// Explicit locale keeps server and client output identical (hydration-safe).
export function formatDateTime(
  date: Date | string,
  locale: string = "fr-MA",
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function absoluteUrl(path: string): string {
  return publicPageUrl(path.startsWith("/") ? path : `/${path}`);
}
