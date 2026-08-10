import { redirect, notFound } from "next/navigation";
import { SignInForm } from "@/components/storefront/sign-in-form";
import { auth } from "@/lib/auth";
import { isLocale } from "@/i18n/get-dictionary";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  if (session?.user) redirect(`/${locale}/account`);
  return <div className="luxury-container pb-24 page-pad"><div className="mb-10 text-center"><p className="text-[11px] uppercase tracking-[.24em] text-accent">Private client area</p><h1 className="mt-2 font-display text-5xl">Welcome to LORVEX</h1></div><SignInForm locale={locale} /></div>;
}
