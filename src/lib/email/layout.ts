import {
  PRODUCTION_SITE_ORIGIN,
  siteConfig,
  type Locale,
} from "@/config/site";
import { escapeAttr, escapeHtml } from "@/lib/email/html";
import { emailTheme as t } from "@/lib/email/theme";

const LOGO_SRC = `${PRODUCTION_SITE_ORIGIN}/icons/icon-192.png`;
const SITE_URL = PRODUCTION_SITE_ORIGIN;

export type EmailCta = {
  href: string;
  label: string;
};

export type LorvexEmailInput = {
  locale: Locale;
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: EmailCta;
  secondaryHtml?: string;
  supportEmail?: string;
};

const chrome = {
  fr: {
    descriptor: "Horlogerie de luxe",
    supportRole: "Conciergerie",
    regards: "Cordialement,",
    visit: "Visiter LORVEX",
    copyright: (year: number) =>
      `© ${year} LORVEX. Tous droits réservés.`,
  },
  en: {
    descriptor: "Luxury Timepieces",
    supportRole: "Customer Support",
    regards: "Best regards,",
    visit: "Visit LORVEX",
    copyright: (year: number) => `© ${year} LORVEX. All rights reserved.`,
  },
  ar: {
    descriptor: "ساعات فاخرة",
    supportRole: "خدمة العملاء",
    regards: "مع أطيب التحيات،",
    visit: "زيارة لورفكس",
    copyright: (year: number) => `© ${year} LORVEX. جميع الحقوق محفوظة.`,
  },
} as const;

function chromeCopy(locale: Locale) {
  return chrome[locale] ?? chrome.fr;
}

export function emailLogoUrl() {
  return LOGO_SRC;
}

export function emailSiteUrl() {
  return SITE_URL;
}

function headerHtml(locale: Locale) {
  const c = chromeCopy(locale);
  return `<tr><td align="center" style="padding:36px 36px 24px;border-bottom:1px solid ${t.border};">
  <img src="${escapeAttr(LOGO_SRC)}" width="48" height="48" alt="LORVEX" style="display:block;border:0;margin:0 auto 14px;width:48px;height:48px;" />
  <p style="margin:0;font-family:${t.headingFont};font-size:13px;letter-spacing:0.34em;text-transform:uppercase;color:${t.ink};">LORVEX</p>
  <p style="margin:8px 0 0;font-family:${t.bodyFont};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${t.accent};">${escapeHtml(c.descriptor)}</p>
</td></tr>`;
}

function buttonHtml(cta: EmailCta) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:8px auto 24px;">
  <tr>
    <td align="center" bgcolor="${t.buttonBg}" style="background:${t.buttonBg};">
      <a href="${escapeAttr(cta.href)}" style="display:inline-block;padding:14px 28px;font-family:${t.bodyFont};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${t.buttonFg};text-decoration:none;">${escapeHtml(cta.label)}</a>
    </td>
  </tr>
</table>`;
}

function signatureHtml(locale: Locale, supportEmail: string) {
  const c = chromeCopy(locale);
  return `<p style="margin:28px 0 0;font-family:${t.bodyFont};font-size:15px;line-height:1.7;color:${t.body};">${escapeHtml(c.regards)}</p>
<p style="margin:16px 0 0;font-family:${t.headingFont};font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:${t.ink};">LORVEX</p>
<p style="margin:6px 0 0;font-family:${t.bodyFont};font-size:13px;color:${t.muted};">${escapeHtml(c.supportRole)}</p>
<p style="margin:10px 0 0;font-family:${t.bodyFont};font-size:13px;">
  <a href="mailto:${escapeAttr(supportEmail)}" style="color:${t.ink};text-decoration:none;">${escapeHtml(supportEmail)}</a>
</p>
<p style="margin:4px 0 0;font-family:${t.bodyFont};font-size:13px;">
  <a href="${escapeAttr(SITE_URL)}" style="color:${t.accent};text-decoration:none;">www.lorvex.ma</a>
</p>`;
}

function footerHtml(locale: Locale, supportEmail: string) {
  const c = chromeCopy(locale);
  const year = new Date().getFullYear();
  const social = [
    { href: siteConfig.social.instagram, label: "Instagram" },
    { href: siteConfig.social.facebook, label: "Facebook" },
    { href: siteConfig.social.tiktok, label: "TikTok" },
  ]
    .map(
      (item) =>
        `<a href="${escapeAttr(item.href)}" style="color:${t.muted};text-decoration:none;margin:0 8px;">${escapeHtml(item.label)}</a>`,
    )
    .join("");
  return `<tr><td style="padding:22px 36px 32px;border-top:1px solid ${t.border};font-family:${t.bodyFont};font-size:12px;line-height:1.6;color:${t.muted};text-align:center;">
  <p style="margin:0;font-family:${t.headingFont};letter-spacing:0.28em;text-transform:uppercase;color:${t.ink};">LORVEX</p>
  <p style="margin:8px 0 0;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(c.descriptor)}</p>
  <p style="margin:14px 0 0;">
    <a href="${escapeAttr(SITE_URL)}" style="color:${t.accent};text-decoration:none;">${escapeHtml(c.visit)}</a>
    &nbsp;·&nbsp;
    <a href="mailto:${escapeAttr(supportEmail)}" style="color:${t.ink};text-decoration:none;">${escapeHtml(supportEmail)}</a>
  </p>
  <p style="margin:12px 0 0;">${social}</p>
  <p style="margin:16px 0 0;">${escapeHtml(c.copyright(year))}</p>
</td></tr>`;
}

export function renderLorvexEmail(input: LorvexEmailInput) {
  const locale = input.locale;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const supportEmail = input.supportEmail?.trim() || siteConfig.supportEmail;
  const preheader = escapeHtml(input.preheader);
  const title = escapeHtml(input.title);
  const cta = input.cta ? buttonHtml(input.cta) : "";
  const secondary = input.secondaryHtml ?? "";

  return `<!DOCTYPE html>
<html lang="${escapeAttr(locale)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${t.pageBg};color:${t.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${t.pageBg};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${t.width}px;width:100%;background:${t.cardBg};border:1px solid ${t.border};">
        ${headerHtml(locale)}
        <tr><td align="${dir === "rtl" ? "right" : "left"}" style="padding:28px 36px;font-family:${t.bodyFont};font-size:15px;line-height:1.7;color:${t.body};">
          <h1 style="margin:0 0 20px;font-family:${t.headingFont};font-size:26px;font-weight:400;line-height:1.25;color:${t.ink};">${title}</h1>
          ${input.bodyHtml}
          ${cta}
          ${secondary}
          ${signatureHtml(locale, supportEmail)}
        </td></tr>
        ${footerHtml(locale, supportEmail)}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function wrapCampaignHtml(input: {
  locale?: Locale;
  subject: string;
  bodyHtml: string;
  supportEmail?: string;
}) {
  return renderLorvexEmail({
    locale: input.locale ?? "fr",
    preheader: input.subject,
    title: input.subject,
    bodyHtml: input.bodyHtml,
    supportEmail: input.supportEmail,
  });
}
