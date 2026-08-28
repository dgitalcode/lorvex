import { notFound } from "next/navigation";
import { CartView } from "@/components/storefront/cart-view";
import { isLocale } from "@/i18n/get-dictionary";

export const metadata = { title: "Cart", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CartView locale={locale} />;
}
