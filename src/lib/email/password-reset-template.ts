import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/format";

const copy = {
  fr: {
    subject: "Réinitialisation de votre mot de passe LORVEX",
    greeting: "Bonjour,",
    intro:
      "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte LORVEX.",
    cta: "Réinitialiser mon mot de passe",
    expires: "Ce lien expire dans 45 minutes.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Votre mot de passe actuel reste inchangé.",
    paste: "Ou copiez ce lien dans votre navigateur :",
    support: "Besoin d’aide ?",
    footer: "Maison LORVEX · Casablanca, Maroc",
  },
  en: {
    subject: "Reset your LORVEX password",
    greeting: "Hello,",
    intro:
      "We received a request to reset the password for your LORVEX account.",
    cta: "Reset my password",
    expires: "This link expires in 45 minutes.",
    ignore:
      "If you did not request this, you can ignore this email. Your current password will remain unchanged.",
    paste: "Or paste this link into your browser:",
    support: "Need assistance?",
    footer: "Maison LORVEX · Casablanca, Morocco",
  },
  ar: {
    subject: "إعادة تعيين كلمة مرور LORVEX",
    greeting: "مرحباً،",
    intro: "تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك في LORVEX.",
    cta: "إعادة تعيين كلمة المرور",
    expires: "ينتهي صلاحية هذا الرابط خلال 45 دقيقة.",
    ignore:
      "إذا لم تطلب ذلك، تجاهل هذا البريد. ستبقى كلمة مرورك الحالية دون تغيير.",
    paste: "أو انسخ هذا الرابط إلى متصفحك:",
    support: "هل تحتاج مساعدة؟",
    footer: "دار LORVEX · الدار البيضاء، المغرب",
  },
} as const;

export function buildPasswordResetEmail(input: {
  locale: Locale;
  token: string;
}) {
  const t = copy[input.locale] ?? copy.fr;
  const resetUrl = absoluteUrl(
    `/${input.locale}/reset-password?token=${encodeURIComponent(input.token)}`,
  );
  const dir = input.locale === "ar" ? "rtl" : "ltr";

  const html = `<!DOCTYPE html>
<html lang="${input.locale}" dir="${dir}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f7f5f1;font-family:Georgia,'Times New Roman',serif;color:#12110f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5f1;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fffcf8;border:1px solid #ddd6ca;">
        <tr><td style="padding:36px 36px 24px;border-bottom:1px solid #ddd6ca;">
          <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#b89b6a;">LORVEX</p>
          <h1 style="margin:16px 0 0;font-size:28px;font-weight:400;letter-spacing:0.02em;">${t.subject}</h1>
        </td></tr>
        <tr><td style="padding:28px 36px;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;color:#3a3630;">
          <p style="margin:0 0 16px;">${t.greeting}</p>
          <p style="margin:0 0 24px;">${t.intro}</p>
          <p style="margin:0 0 28px;text-align:center;">
            <a href="${resetUrl}" style="display:inline-block;background:#12110f;color:#f7f5f1;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">${t.cta}</a>
          </p>
          <p style="margin:0 0 12px;font-size:14px;color:#6b655c;">${t.expires}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#6b655c;">${t.ignore}</p>
          <p style="margin:0 0 8px;font-size:12px;color:#6b655c;">${t.paste}</p>
          <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${resetUrl}" style="color:#b89b6a;">${resetUrl}</a></p>
        </td></tr>
        <tr><td style="padding:20px 36px 32px;border-top:1px solid #ddd6ca;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b655c;">
          <p style="margin:0 0 8px;">${t.support} <a href="mailto:${siteConfig.supportEmail}" style="color:#12110f;">${siteConfig.supportEmail}</a></p>
          <p style="margin:0;">${t.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: t.subject, html, resetUrl };
}
