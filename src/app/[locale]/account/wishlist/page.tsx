import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isLocale } from "@/i18n/get-dictionary";
import { WishlistView } from "@/components/storefront/wishlist-view";

export const metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/sign-in`);
  return <div className="luxury-container pb-24 page-pad"><Link href={`/${locale}/account`} className="text-xs uppercase tracking-[.18em] text-muted-foreground">← Account</Link><h1 className="mb-10 mt-5 font-display text-5xl">Your wishlist</h1><WishlistView locale={locale} /></div>;
}
