import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { SignInForm } from "@/components/storefront/sign-in-form";
import { auth } from "@/lib/auth";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { isLocale } from "@/i18n/get-dictionary";
import { getAuthStrings } from "@/i18n/auth-strings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return { title: "Sign in", robots: { index: false } };
  }
  return { title: getAuthStrings(locale).signIn, robots: { index: false } };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getAuthStrings(locale);

  const sp = await searchParams;
  const callbackUrl = Array.isArray(sp.callbackUrl)
    ? sp.callbackUrl[0]
    : sp.callbackUrl;

  const session = await auth();
  if (session?.user) {
    redirect(
      resolvePostLoginPath({
        role: session.user.role,
        locale,
        callbackUrl,
      }),
    );
  }

  return (
    <div className="luxury-container pb-24 page-pad">
      <div className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[.24em] text-accent">
          {t.signInEyebrow}
        </p>
        <h1 className="mt-2 font-display text-5xl">{t.signInWelcome}</h1>
      </div>
      <SignInForm locale={locale} callbackUrl={callbackUrl} />
    </div>
  );
}
