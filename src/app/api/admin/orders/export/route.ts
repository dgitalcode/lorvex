import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/export";
import { assertPermission } from "@/server/auth/require-admin";

export async function GET(request: Request) {
  try {
    await assertPermission("orders.view");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q")?.trim();

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const csv = toCsv(
    orders.map((order) => ({
      number: order.number,
      date: order.createdAt.toISOString(),
      email: order.email,
      phone: order.phone ?? "",
      items: order._count.items,
      subtotal: Number(order.subtotal),
      discount: Number(order.discountTotal),
      shipping: Number(order.shippingTotal),
      total: Number(order.grandTotal),
      currency: order.currency,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      status: order.status,
      coupon: order.couponCode ?? "",
      tracking: order.trackingNumber ?? "",
    })),
  );

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`lorvex-orders-${date}.csv`, csv);
}
