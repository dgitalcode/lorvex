import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { getAuthStrings } from "@/i18n/auth-strings";
import { ForgotPasswordForm } from "@/components/storefront/forgot-password-form";

export const metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const t = getAuthStrings(locale);

  return (
    <div className="luxury-container pb-24 page-pad">
      <div className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
          {t.signIn}
        </p>
        <h1 className="mt-2 font-display text-5xl">{t.forgotTitle}</h1>
      </div>
      <ForgotPasswordForm locale={locale} />
    </div>
  );
}
