import Link from "next/link";
import { cache } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { composeDocumentTitle } from "@/lib/document-title";
import { isLocale } from "@/i18n/get-dictionary";
import { auth } from "@/lib/auth";
import { getClientIp } from "@/server/services/security";
import { findAuthorizedStorefrontOrder } from "@/server/services/order-access";
import { orderStatusLabel } from "@/lib/order-status-label";

export const dynamic = "force-dynamic";

type OrderPageProps = {
  params: Promise<{ locale: string; number: string }>;
  searchParams: Promise<{ k?: string | string[] }>;
};

const resolveAuthorizedOrder = cache(
  async (locale: string, number: string, presentedToken: string | undefined) => {
    if (!isLocale(locale)) {
      return { status: "deny" as const, order: undefined };
    }
    return findAuthorizedStorefrontOrder({
      number,
      presentedToken,
      session: await auth(),
      ip: await getClientIp(),
    });
  },
);

function presentedAccessToken(k: string | string[] | undefined) {
  return Array.isArray(k) ? k[0] : k;
}

function paymentCopy(
  locale: string,
  method: string,
  paymentStatus: string,
) {
  if (method === "COD") {
    if (locale === "ar") {
      return "الدفع عند الاستلام · الحالة: في انتظار الدفع (غير مدفوع مسبقًا)";
    }
    if (locale === "en") {
      return "Cash on delivery · Status: awaiting payment (not prepaid)";
    }
    return "Paiement à la livraison (COD) · Statut : en attente de paiement (non prépayé)";
  }
  if (locale === "ar") {
    return `طريقة الدفع: ${method} · حالة الدفع: ${paymentStatus}`;
  }
  if (locale === "en") {
    return `Payment method: ${method} · Payment status: ${paymentStatus}`;
  }
  return `Mode de paiement : ${method} · Statut du paiement : ${paymentStatus}`;
}

export default async function OrderPage({
  params,
  searchParams,
}: OrderPageProps) {
  const { locale, number } = await params;
  const sp = await searchParams;
  const presentedToken = presentedAccessToken(sp.k);
  const result = await resolveAuthorizedOrder(locale, number, presentedToken);
  if (result.status !== "allow" || !result.order) notFound();
  const order = result.order;

  const downloadLabel =
    locale === "ar"
      ? "تحميل الإيصال"
      : locale === "en"
        ? "Download receipt"
        : "Télécharger le bon";

  return (
    <div className="luxury-container pb-24 page-pad">
      <title>{composeDocumentTitle("Order confirmed")}</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="mx-auto max-w-3xl">
        <div className="animate-check-pop flex h-16 w-16 items-center justify-center border border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-accent">
          {orderStatusLabel(
            locale === "ar" || locale === "en" ? locale : "fr",
            order.status,
          )}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-tight text-balance md:text-6xl">
          {locale === "ar"
            ? "شكرًا لاختيارك لورفكس."
            : locale === "en"
              ? "Thank you for choosing LORVEX."
              : "Merci d'avoir choisi LORVEX."}
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          {locale === "ar" ? (
            <>
              تم استلام الطلب{" "}
              <strong className="text-foreground">{order.number}</strong>. ستُرسل
              تفاصيل التأكيد إلى {order.email}.
            </>
          ) : locale === "en" ? (
            <>
              Order <strong className="text-foreground">{order.number}</strong> has
              been received. Confirmation details will be sent to {order.email}.
            </>
          ) : (
            <>
              La commande{" "}
              <strong className="text-foreground">{order.number}</strong> a été
              reçue. Les détails de confirmation seront envoyés à {order.email}.
            </>
          )}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          {paymentCopy(locale, order.paymentMethod, order.paymentStatus)}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a
              href={
                presentedToken
                  ? `/api/orders/${order.number}/receipt?k=${encodeURIComponent(presentedToken)}`
                  : `/api/orders/${order.number}/receipt`
              }
            >
              <Download className="me-2 h-4 w-4" />
              {downloadLabel}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/shop`}>
              {locale === "ar"
                ? "متابعة الاستكشاف"
                : locale === "en"
                  ? "Continue exploring"
                  : "Continuer l'exploration"}
            </Link>
          </Button>
        </div>

        <div className="mt-10 border border-border/80 bg-card p-7 shadow-[var(--shadow-soft)] md:p-9">
          <h2 className="font-display text-3xl">
            {locale === "ar"
              ? "تفاصيل الطلب"
              : locale === "en"
                ? "Order details"
                : "Détails de la commande"}
          </h2>
          <div className="mt-6 divide-y divide-border/80">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <span>
                  {item.name}{" "}
                  <small className="text-muted-foreground">
                    × {item.quantity}
                  </small>
                </span>
                <span className="tabular-nums">
                  {formatPrice(Number(item.totalPrice), order.currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-border/80 pt-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {locale === "ar" ? "المجموع الفرعي" : locale === "en" ? "Subtotal" : "Sous-total"}
              </span>
              <span className="tabular-nums">
                {formatPrice(Number(order.subtotal), order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {locale === "ar" ? "الشحن" : locale === "en" ? "Shipping" : "Livraison"}
              </span>
              <span className="tabular-nums">
                {formatPrice(Number(order.shippingTotal), order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <strong>Total</strong>
              <strong className="tabular-nums">
                {formatPrice(Number(order.grandTotal), order.currency)}
              </strong>
            </div>
          </div>
          {order.shippingAddress && (
            <div className="mt-7 border-t border-border/80 pt-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {locale === "ar"
                  ? "عنوان التسليم"
                  : locale === "en"
                    ? "Delivery address"
                    : "Adresse de livraison"}
              </p>
              <p className="mt-2 leading-relaxed">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                <br />
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.city}, Morocco
              </p>
              {order.shippingMethod && (
                <p className="mt-3">{order.shippingMethod.name}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
