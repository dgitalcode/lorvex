import type { Locale } from "@/config/site";
import { absoluteUrl } from "@/lib/format";
import { escapeAttr, escapeHtml } from "@/lib/email/html";
import { renderLorvexEmail } from "@/lib/email/layout";
import { emailTheme as t } from "@/lib/email/theme";

const copy = {
  fr: {
    subject: "Réinitialisation de votre mot de passe LORVEX",
    preheader: "Réinitialisez votre mot de passe LORVEX. Ce lien expire dans 45 minutes.",
    greeting: "Bonjour,",
    intro:
      "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte LORVEX.",
    cta: "Réinitialiser mon mot de passe",
    expires: "Ce lien expire dans 45 minutes.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Votre mot de passe actuel reste inchangé.",
    paste: "Ou copiez ce lien dans votre navigateur :",
  },
  en: {
    subject: "Reset your LORVEX password",
    preheader: "Reset your LORVEX password. This link expires in 45 minutes.",
    greeting: "Hello,",
    intro:
      "We received a request to reset the password for your LORVEX account.",
    cta: "Reset my password",
    expires: "This link expires in 45 minutes.",
    ignore:
      "If you did not request this, you can ignore this email. Your current password will remain unchanged.",
    paste: "Or paste this link into your browser:",
  },
  ar: {
    subject: "إعادة تعيين كلمة مرور LORVEX",
    preheader: "أعد تعيين كلمة مرور لورفكس. ينتهي هذا الرابط خلال 45 دقيقة.",
    greeting: "مرحباً،",
    intro: "تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك في LORVEX.",
    cta: "إعادة تعيين كلمة المرور",
    expires: "ينتهي صلاحية هذا الرابط خلال 45 دقيقة.",
    ignore:
      "إذا لم تطلب ذلك، تجاهل هذا البريد. ستبقى كلمة مرورك الحالية دون تغيير.",
    paste: "أو انسخ هذا الرابط إلى متصفحك:",
  },
} as const;

export function buildPasswordResetEmail(input: {
  locale: Locale;
  token: string;
}) {
  const locale = copy[input.locale] ? input.locale : "fr";
  const c = copy[locale];
  const resetUrl = absoluteUrl(
    `/${locale}/reset-password?token=${encodeURIComponent(input.token)}`,
  );
  const bodyHtml = `<p style="margin:0 0 16px;">${c.greeting}</p>
<p style="margin:0 0 8px;">${c.intro}</p>`;
  const secondaryHtml = `<p style="margin:0 0 12px;font-size:14px;color:${t.muted};">${c.expires}</p>
<p style="margin:0 0 20px;font-size:14px;color:${t.muted};">${c.ignore}</p>
<p style="margin:0 0 8px;font-size:12px;color:${t.muted};">${c.paste}</p>
<p style="margin:0;font-size:12px;word-break:break-all;"><a href="${escapeAttr(resetUrl)}" style="color:${t.accent};">${escapeHtml(resetUrl)}</a></p>`;

  return {
    subject: c.subject,
    html: renderLorvexEmail({
      locale,
      preheader: c.preheader,
      title: c.subject,
      bodyHtml,
      cta: { href: resetUrl, label: c.cta },
      secondaryHtml,
    }),
    resetUrl,
  };
}
