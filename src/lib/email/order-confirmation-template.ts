import type { Locale } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { escapeHtml } from "@/lib/email/html";
import { renderLorvexEmail } from "@/lib/email/layout";
import { emailTheme as t } from "@/lib/email/theme";

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

const copy = {
  fr: {
    subject: (number: string) => `Confirmation de commande ${number} · LORVEX`,
    preheader: "Votre commande LORVEX a bien été enregistrée.",
    greeting: (name: string) => `Bonjour ${name},`,
    intro:
      "Nous avons bien reçu votre commande. Elle est enregistrée et sera préparée par la maison.",
    next: "Prochaine étape : paiement à la livraison (COD). Notre équipe vous contacte si besoin pour la remise.",
    items: "Pièces",
    subtotal: "Sous-total",
    shipping: "Livraison",
    discount: "Remise",
    total: "Total",
    payment: "Paiement",
    paymentCod: "Paiement à la livraison (non prépayé)",
    shipTo: "Livraison",
  },
  en: {
    subject: (number: string) => `Order confirmation ${number} · LORVEX`,
    preheader: "Your LORVEX order has been received.",
    greeting: (name: string) => `Hello ${name},`,
    intro:
      "We have received your order. It is recorded and will be prepared by the house.",
    next: "Next step: cash on delivery (COD). Our team will contact you if anything is needed for handover.",
    items: "Pieces",
    subtotal: "Subtotal",
    shipping: "Shipping",
    discount: "Discount",
    total: "Total",
    payment: "Payment",
    paymentCod: "Cash on delivery (not prepaid)",
    shipTo: "Delivery",
  },
  ar: {
    subject: (number: string) => `تأكيد الطلب ${number} · LORVEX`,
    preheader: "تم تسجيل طلبك لدى لورفكس.",
    greeting: (name: string) => `مرحباً ${name}،`,
    intro: "استلمنا طلبك. تم تسجيله وستجهّزه الدار.",
    next: "الخطوة التالية: الدفع عند الاستلام. يتواصل فريقنا عند الحاجة لتسليم الطلب.",
    items: "القطع",
    subtotal: "المجموع الفرعي",
    shipping: "التوصيل",
    discount: "الخصم",
    total: "الإجمالي",
    payment: "الدفع",
    paymentCod: "الدفع عند الاستلام (غير مدفوع مسبقاً)",
    shipTo: "التوصيل",
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
  const locale = copy[input.locale] ? input.locale : "fr";
  const c = copy[locale];
  const loc = priceLocale(locale);
  const name = escapeHtml(`${input.firstName} ${input.lastName}`.trim());
  const payment =
    input.paymentMethod === "COD" ? c.paymentCod : escapeHtml(input.paymentMethod);
  const subject = c.subject(input.number);
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

  const bodyHtml = `<p style="margin:0 0 16px;">${c.greeting(name)}</p>
<p style="margin:0 0 12px;">${c.intro}</p>
<p style="margin:0 0 24px;"><strong>${escapeHtml(input.number)}</strong></p>
<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${t.accent};">${c.items}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
  ${rows}
</table>
<p style="margin:16px 0 0;">${c.subtotal}: ${escapeHtml(formatPrice(input.subtotal, input.currency, loc))}</p>
<p style="margin:4px 0 0;">${c.shipping}: ${escapeHtml(formatPrice(input.shippingTotal, input.currency, loc))}</p>
${
  input.discountTotal > 0
    ? `<p style="margin:4px 0 0;">${c.discount}: −${escapeHtml(formatPrice(input.discountTotal, input.currency, loc))}</p>`
    : ""
}
<p style="margin:12px 0 0;font-size:16px;"><strong>${c.total}: ${escapeHtml(formatPrice(input.grandTotal, input.currency, loc))}</strong></p>
<p style="margin:20px 0 0;">${c.payment}: ${payment}</p>
<p style="margin:8px 0 0;">${c.shipTo}: ${address}</p>
<p style="margin:20px 0 0;">${c.next}</p>`;

  return {
    subject,
    html: renderLorvexEmail({
      locale,
      preheader: c.preheader,
      title: subject,
      bodyHtml,
    }),
  };
}
