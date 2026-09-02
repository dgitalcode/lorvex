import type { Locale } from "@/config/site";
import { getDictionary } from "@/i18n/get-dictionary";

export type CheckoutErrorCode =
  | "CART"
  | "VALIDATION"
  | "PAYMENT_METHOD"
  | "RATE_LIMIT"
  | "STOCK"
  | "PRODUCT"
  | "SHIPPING"
  | "COUPON"
  | "GENERIC";

export function checkoutErrorMessage(
  locale: Locale,
  code: CheckoutErrorCode,
): string {
  return getDictionary(locale).checkout.errors[code];
}

export function localeFromCheckout(raw: unknown): Locale {
  return raw === "en" || raw === "ar" ? raw : "fr";
}
