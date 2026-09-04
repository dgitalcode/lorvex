import type { Locale } from "@/config/site";
import { escapeHtml } from "@/lib/email/html";
import { renderLorvexEmail } from "@/lib/email/layout";
import { emailTheme as t } from "@/lib/email/theme";

const copy = {
  fr: {
    subject: "Nouvelle demande de contact — LORVEX",
    preheader: "Une nouvelle demande a été reçue depuis le site LORVEX.",
    greeting: "Bonjour,",
    intro: "Vous avez reçu une nouvelle demande depuis le site LORVEX.",
    customer: "Client",
    email: "E-mail",
    topic: "Sujet",
    message: "Message",
    cta: "Répondre au client",
  },
  en: {
    subject: "New contact enquiry — LORVEX",
    preheader: "A new customer enquiry has been received.",
    greeting: "Hello,",
    intro: "You have received a new enquiry from the LORVEX website.",
    customer: "Customer",
    email: "Email",
    topic: "Subject",
    message: "Message",
    cta: "Reply to customer",
  },
  ar: {
    subject: "طلب تواصل جديد — LORVEX",
    preheader: "تم استلام طلب جديد من موقع لورفكس.",
    greeting: "مرحباً،",
    intro: "وصلكم طلب جديد من موقع لورفكس.",
    customer: "العميل",
    email: "البريد الإلكتروني",
    topic: "الموضوع",
    message: "الرسالة",
    cta: "الرد على العميل",
  },
} as const;

function localeOf(value: string): Locale {
  return value === "en" || value === "ar" ? value : "fr";
}

export function buildContactEnquiryEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: string;
  supportEmail?: string;
}) {
  const locale = localeOf(input.locale);
  const c = copy[locale];
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const topic = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replaceAll("\n", "<br/>");
  const mailto = `mailto:${input.email}?subject=${encodeURIComponent(`Re: ${input.subject}`)}`;
  const label = `margin:0 0 6px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${t.accent};`;
  const bodyHtml = `<p style="margin:0 0 16px;">${c.greeting}</p>
<p style="margin:0 0 24px;">${c.intro}</p>
<p style="${label}">${c.customer}</p>
<p style="margin:0 0 16px;color:${t.ink};">${name}</p>
<p style="${label}">${c.email}</p>
<p style="margin:0 0 16px;"><a href="mailto:${email}" style="color:${t.ink};text-decoration:none;">${email}</a></p>
<p style="${label}">${c.topic}</p>
<p style="margin:0 0 16px;color:${t.ink};">${topic}</p>
<p style="${label}">${c.message}</p>
<p style="margin:0 0 8px;color:${t.ink};">${message}</p>`;

  return {
    subject: c.subject,
    html: renderLorvexEmail({
      locale,
      preheader: c.preheader,
      title: c.subject,
      bodyHtml,
      cta: { href: mailto, label: c.cta },
      supportEmail: input.supportEmail,
    }),
  };
}
