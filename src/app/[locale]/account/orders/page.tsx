import Link from "next/link";
import { Download } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/i18n/get-dictionary";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status-label";
import type { Locale } from "@/config/site";

export const metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/sign-in`);

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  const receiptLabel =
    locale === "ar"
      ? "الإيصال"
      : locale === "en"
        ? "Receipt"
        : "Bon";

  return (
    <div className="luxury-container pb-24 page-pad">
      <Link
        href={`/${locale}/account`}
        className="text-xs uppercase tracking-[.18em] text-muted-foreground"
      >
        ← Account
      </Link>
      <h1 className="mt-5 font-display text-5xl">Your orders</h1>
      <div className="mt-10 divide-y border bg-card px-6">
        {orders.length ? (
          orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                href={`/${locale}/order/${order.number}`}
                className="grid flex-1 gap-2 transition hover:text-accent sm:grid-cols-4 sm:items-center"
              >
                <strong>{order.number}</strong>
                <span className="text-sm">
                  {order.createdAt.toLocaleDateString(locale)}
                </span>
                <span className="text-sm">
                  {order._count.items} item(s) ·{" "}
                  {orderStatusLabel(locale as Locale, order.status)}
                  {order.paymentMethod === "COD"
                    ? ` · COD (${order.paymentStatus})`
                    : ` · ${order.paymentStatus}`}
                </span>
                <span className="sm:text-right">
                  {formatPrice(Number(order.grandTotal), order.currency)}
                </span>
              </Link>
              <a
                href={`/api/orders/${order.number}/receipt`}
                className="inline-flex items-center gap-2 self-start text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent sm:self-center"
              >
                <Download className="h-3.5 w-3.5" />
                {receiptLabel}
              </a>
            </div>
          ))
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            You have not placed an order yet.
          </p>
        )}
      </div>
    </div>
  );
}
