import Link from "next/link";
import { CheckCircle2, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { isLocale } from "@/i18n/get-dictionary";
import { auth } from "@/lib/auth";
import { getClientIp } from "@/server/services/security";
import { findAuthorizedStorefrontOrder } from "@/server/services/order-access";

export const metadata = { title: "Order confirmed", robots: { index: false } };

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
}: {
  params: Promise<{ locale: string; number: string }>;
  searchParams: Promise<{ k?: string | string[] }>;
}) {
  const { locale, number } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const presentedToken = Array.isArray(sp.k) ? sp.k[0] : sp.k;
  const session = await auth();
  const result = await findAuthorizedStorefrontOrder({
    number,
    presentedToken,
    session,
    ip: await getClientIp(),
  });
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
      <div className="mx-auto max-w-3xl">
        <div className="animate-check-pop flex h-16 w-16 items-center justify-center border border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-accent">
          {locale === "ar"
            ? "تم تأكيد الطلب"
            : locale === "en"
              ? "Order confirmed"
              : "Commande confirmée"}
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
