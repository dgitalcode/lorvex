import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/require-admin";
import { LabelDocument } from "@/components/admin/orders/label-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertPermission("orders.manage");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      shippingMethod: true,
    },
  });
  if (!order) notFound();

  const buffer = await renderToBuffer(<LabelDocument order={order} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="label-${order.number}.pdf"`,
    },
  });
}
