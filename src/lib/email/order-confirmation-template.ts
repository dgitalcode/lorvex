import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";

export type OrderConfirmationLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderConfirmationPayload = {
  locale: Locale;
  number: string;
  email: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  city: string;
  items: OrderConfirmationLine[];
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  paymentMethod: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const copy = {
  fr: {
    subject: (number: string) => `Confirmation de commande ${number} · LORVEX`,
    greeting: (name: string) => `Bonjour ${name},`,
    intro:
      "Nous avons bien reçu votre commande. Elle est enregistrée et sera préparée par la maison.",
    next: "Prochaine étape : paiement à la livraison (COD). Notre équipe vous contacte si besoin pour la remise.",
    items: "Pièces",
    qty: "Qté",
    subtotal: "Sous-total",
    shipping: "Livraison",
    discount: "Remise",
    total: "Total",
    payment: "Paiement",
    paymentCod: "Paiement à la livraison (non prépayé)",
    shipTo: "Livraison",
    support: "Conciergerie",
    footer: "Maison LORVEX · Maroc",
  },
  en: {
    subject: (number: string) => `Order confirmation ${number} · LORVEX`,
    greeting: (name: string) => `Hello ${name},`,
    intro:
      "We have received your order. It is recorded and will be prepared by the house.",
    next: "Next step: cash on delivery (COD). Our team will contact you if anything is needed for handover.",
    items: "Pieces",
    qty: "Qty",
    subtotal: "Subtotal",
    shipping: "Shipping",
    discount: "Discount",
    total: "Total",
    payment: "Payment",
    paymentCod: "Cash on delivery (not prepaid)",
    shipTo: "Delivery",
    support: "Concierge",
    footer: "Maison LORVEX · Morocco",
  },
  ar: {
    subject: (number: string) => `تأكيد الطلب ${number} · LORVEX`,
    greeting: (name: string) => `مرحباً ${name}،`,
    intro: "استلمنا طلبك. تم تسجيله وستجهّزه الدار.",
    next: "الخطوة التالية: الدفع عند الاستلام. يتواصل فريقنا عند الحاجة لتسليم الطلب.",
    items: "القطع",
    qty: "الكمية",
    subtotal: "المجموع الفرعي",
    shipping: "التوصيل",
    discount: "الخصم",
    total: "الإجمالي",
    payment: "الدفع",
    paymentCod: "الدفع عند الاستلام (غير مدفوع مسبقاً)",
    shipTo: "التوصيل",
    support: "الاستقبال",
    footer: "دار LORVEX · المغرب",
  },
} as const;

function priceLocale(locale: Locale) {
  if (locale === "en") return "en-MA";
  if (locale === "ar") return "ar-MA";
  return "fr-MA";
}

export const ORDER_CONFIRMATION_TEMPLATE = "order_confirmation";

export function confirmationEmailAlreadyDelivered(
  logs: { template?: string | null; status: string }[],
) {
  return logs.some(
    (log) =>
      log.template === ORDER_CONFIRMATION_TEMPLATE && log.status === "SENT",
  );
}

export function buildOrderConfirmationEmail(input: OrderConfirmationPayload) {
  const t = copy[input.locale] ?? copy.fr;
  const dir = input.locale === "ar" ? "rtl" : "ltr";
  const loc = priceLocale(input.locale);
  const name = escapeHtml(`${input.firstName} ${input.lastName}`.trim());
  const payment =
    input.paymentMethod === "COD" ? t.paymentCod : escapeHtml(input.paymentMethod);
  const subject = t.subject(input.number);
  const address = [input.line1, input.line2, input.city]
    .filter(Boolean)
    .map((part) => escapeHtml(String(part)))
    .join(", ");

  const rows = input.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee6d8;">${escapeHtml(item.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee6d8;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee6d8;text-align:end;">${escapeHtml(formatPrice(item.totalPrice, input.currency, loc))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${input.locale}" dir="${dir}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f7f5f1;color:#12110f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5f1;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fffcf8;border:1px solid #ddd6ca;">
        <tr><td style="padding:36px 36px 24px;border-bottom:1px solid #ddd6ca;">
          <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#b89b6a;">LORVEX</p>
          <h1 style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;">${escapeHtml(subject)}</h1>
        </td></tr>
        <tr><td style="padding:28px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#3a3630;">
          <p style="margin:0 0 16px;">${t.greeting(name)}</p>
          <p style="margin:0 0 12px;">${t.intro}</p>
          <p style="margin:0 0 24px;"><strong>${escapeHtml(input.number)}</strong></p>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#b89b6a;">${t.items}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
            ${rows}
          </table>
          <p style="margin:16px 0 0;">${t.subtotal}: ${escapeHtml(formatPrice(input.subtotal, input.currency, loc))}</p>
          <p style="margin:4px 0 0;">${t.shipping}: ${escapeHtml(formatPrice(input.shippingTotal, input.currency, loc))}</p>
          ${
            input.discountTotal > 0
              ? `<p style="margin:4px 0 0;">${t.discount}: −${escapeHtml(formatPrice(input.discountTotal, input.currency, loc))}</p>`
              : ""
          }
          <p style="margin:12px 0 0;font-size:16px;"><strong>${t.total}: ${escapeHtml(formatPrice(input.grandTotal, input.currency, loc))}</strong></p>
          <p style="margin:20px 0 0;">${t.payment}: ${payment}</p>
          <p style="margin:8px 0 0;">${t.shipTo}: ${address}</p>
          <p style="margin:20px 0 0;">${t.next}</p>
        </td></tr>
        <tr><td style="padding:20px 36px 32px;border-top:1px solid #ddd6ca;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b655c;">
          <p style="margin:0 0 8px;">${t.support}: <a href="mailto:${siteConfig.supportEmail}" style="color:#12110f;">${siteConfig.supportEmail}</a></p>
          <p style="margin:0;">${t.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
