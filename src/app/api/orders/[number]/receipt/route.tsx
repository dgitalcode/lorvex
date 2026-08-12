import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { InvoiceDocument } from "@/components/admin/orders/invoice-document";
import { getStorefrontSettings } from "@/server/repositories/settings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      items: true,
      shippingAddress: true,
      shippingMethod: true,
    },
  });
  if (!order) notFound();

  const session = await auth();
  const isOwner =
    session?.user?.id && order.userId && session.user.id === order.userId;
  const isStaff =
    session?.user?.role &&
    ["SUPER_ADMIN", "ADMIN", "EDITOR", "SUPPORT", "ANALYST"].includes(
      session.user.role,
    );

  // Guest confirmation pages are reachable by order number; allow the same
  // for receipt download. Authenticated non-owners who are not staff are denied.
  if (session?.user?.id && order.userId && !isOwner && !isStaff) {
    return new Response("Forbidden", { status: 403 });
  }

  const settings = await getStorefrontSettings();

  const buffer = await renderToBuffer(
    <InvoiceDocument
      order={{
        ...order,
        shippingMethodName: order.shippingMethod?.name ?? null,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
      }}
      title="Order receipt / Bon de commande"
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="lorvex-receipt-${order.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
