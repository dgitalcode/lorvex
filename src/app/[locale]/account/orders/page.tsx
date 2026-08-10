import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/i18n/get-dictionary";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/sign-in`);
  const orders = await prisma.order.findMany({ where: { userId: session.user.id }, include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" } });
  return <div className="luxury-container pb-24 page-pad"><Link href={`/${locale}/account`} className="text-xs uppercase tracking-[.18em] text-muted-foreground">← Account</Link><h1 className="mt-5 font-display text-5xl">Your orders</h1><div className="mt-10 divide-y border bg-card px-6">{orders.length ? orders.map((order) => <Link key={order.id} href={`/${locale}/order/${order.number}`} className="grid gap-2 py-6 transition hover:text-accent sm:grid-cols-4 sm:items-center"><strong>{order.number}</strong><span className="text-sm">{order.createdAt.toLocaleDateString(locale)}</span><span className="text-sm">{order._count.items} item(s) · {order.status}</span><span className="sm:text-right">{formatPrice(Number(order.grandTotal), order.currency)}</span></Link>) : <p className="py-12 text-center text-muted-foreground">You have not placed an order yet.</p>}</div></div>;
}
