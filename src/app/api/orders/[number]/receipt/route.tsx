import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/admin/orders/invoice-document";
import { getStorefrontSettings } from "@/server/repositories/settings";
import { auth } from "@/lib/auth";
import { ipFromRequest } from "@/server/services/security";
import { findAuthorizedStorefrontOrder } from "@/server/services/order-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const token = new URL(request.url).searchParams.get("k");
  const session = await auth();
  const result = await findAuthorizedStorefrontOrder({
    number,
    presentedToken: token,
    session,
    ip: ipFromRequest(request),
  });
  if (result.status === "rate_limited") {
    return new Response("Too many requests", { status: 429 });
  }
  if (result.status !== "allow" || !result.order) notFound();
  const order = result.order;

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
