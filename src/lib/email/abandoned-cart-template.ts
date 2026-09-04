import { PRODUCTION_SITE_ORIGIN } from "@/config/site";
import { escapeHtml } from "@/lib/email/html";
import { renderLorvexEmail } from "@/lib/email/layout";
import { emailTheme as t } from "@/lib/email/theme";

export type AbandonedCartLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export function buildAbandonedCartEmail(input: {
  items: AbandonedCartLine[];
  total: number;
  currency: string;
  cartUrl?: string;
}) {
  const cartUrl = input.cartUrl ?? `${PRODUCTION_SITE_ORIGIN}/fr/cart`;
  const lines = input.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee6d8;">${escapeHtml(item.name)} × ${item.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee6d8;text-align:end;">${escapeHtml(item.unitPrice.toFixed(2))} ${escapeHtml(input.currency)}</td></tr>`,
    )
    .join("");
  const bodyHtml = `<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 20px;">We noticed a selection of timepieces waiting in your LORVEX cart.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">${lines}</table>
<p style="margin:16px 0 0;color:${t.ink};"><strong>Total: ${escapeHtml(Number(input.total).toFixed(2))} ${escapeHtml(input.currency)}</strong></p>`;

  return {
    subject: "You left items in your cart — LORVEX",
    html: renderLorvexEmail({
      locale: "en",
      preheader: "Your LORVEX selection is still waiting.",
      title: "Your selection awaits",
      bodyHtml,
      cta: { href: cartUrl, label: "Complete your order" },
    }),
  };
}
