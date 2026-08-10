import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { isLocale } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Order confirmed", robots: { index: false } };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; number: string }>;
}) {
  const { locale, number } = await params;
  if (!isLocale(locale)) notFound();
  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      items: true,
      shippingAddress: true,
      shippingMethod: true,
    },
  });
  if (!order) notFound();

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
          <div className="mt-5 flex justify-between border-t border-border/80 pt-5 text-lg">
            <strong>Total</strong>
            <strong className="tabular-nums">
              {formatPrice(Number(order.grandTotal), order.currency)}
            </strong>
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
        <Button asChild size="lg" className="mt-8">
          <Link href={`/${locale}/shop`}>
            {locale === "ar"
              ? "متابعة الاستكشاف"
              : locale === "en"
                ? "Continue exploring"
                : "Continuer l'exploration"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
