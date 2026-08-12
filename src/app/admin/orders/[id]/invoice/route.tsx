import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/require-admin";
import { InvoiceDocument } from "@/components/admin/orders/invoice-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertPermission("orders.view");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
    },
  });
  if (!order) notFound();

  const buffer = await renderToBuffer(
    <InvoiceDocument
      order={{
        ...order,
        shippingMethodName: null,
      }}
      title="Invoice"
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${order.number}.pdf"`,
    },
  });
}
