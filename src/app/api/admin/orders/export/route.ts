import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/export";
import {
  authorizeAdminSensitivePost,
  methodNotAllowedGet,
} from "@/server/auth/admin-sensitive-post";

export async function GET() {
  return methodNotAllowedGet();
}

export async function POST(request: Request) {
  const gate = await authorizeAdminSensitivePost(request, "orders.view");
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  let status = searchParams.get("status") ?? undefined;
  let q = searchParams.get("q")?.trim();
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("form")) {
    const form = await request.formData();
    const formStatus = String(form.get("status") ?? "").trim();
    const formQ = String(form.get("q") ?? "").trim();
    if (formStatus) status = formStatus;
    if (formQ) q = formQ;
  }

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
