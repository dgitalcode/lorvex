import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { getAuthStrings } from "@/i18n/auth-strings";
import { ResetPasswordForm } from "@/components/storefront/reset-password-form";
import { getPasswordResetTokenStatus } from "@/server/actions/password-reset";

export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const t = getAuthStrings(locale);
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : "";
  const { status } = token
    ? await getPasswordResetTokenStatus(token)
    : { status: "invalid" as const };

  return (
    <div className="luxury-container pb-24 page-pad">
      <div className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
          LORVEX
        </p>
        <h1 className="mt-2 font-display text-5xl">{t.resetTitle}</h1>
      </div>
      <ResetPasswordForm
        locale={locale}
        token={token}
        tokenStatus={status}
      />
    </div>
  );
}
