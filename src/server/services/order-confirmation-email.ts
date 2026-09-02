import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { logOps } from "@/lib/ops-log";
import type { Locale } from "@/config/site";
import {
  ORDER_CONFIRMATION_TEMPLATE,
  buildOrderConfirmationEmail,
  confirmationEmailAlreadyDelivered,
  type OrderConfirmationPayload,
} from "@/lib/email/order-confirmation-template";

export { ORDER_CONFIRMATION_TEMPLATE, confirmationEmailAlreadyDelivered };

export type EmailSender = typeof sendTransactionalEmail;

export async function sendOrderConfirmationIfNeeded(input: {
  orderNumber: string;
  locale: Locale;
  loadLogs: () => Promise<{ template?: string | null; status: string }[]>;
  loadPayload: () => Promise<OrderConfirmationPayload | null>;
  send: EmailSender;
  onError: (message: string, meta?: Record<string, unknown>) => Promise<void>;
}) {
  const logs = await input.loadLogs();
  if (confirmationEmailAlreadyDelivered(logs)) {
    return { attempted: false as const, reason: "already_sent" as const };
  }
  const payload = await input.loadPayload();
  if (!payload) {
    await input.onError("order_confirmation_missing_order", {
      orderNumber: input.orderNumber,
    });
    return { attempted: false as const, reason: "missing_order" as const };
  }
  const mail = buildOrderConfirmationEmail(payload);
  try {
    const result = await input.send({
      to: payload.email,
      subject: mail.subject,
      html: mail.html,
      template: ORDER_CONFIRMATION_TEMPLATE,
      idempotencyKey: `order-confirmation/${payload.number}`,
      meta: {
        orderNumber: payload.number,
        locale: payload.locale,
        event: "ORDER_CREATED",
      },
    });
    if (!result.ok) {
      await input.onError("order_confirmation_not_sent", {
        orderNumber: payload.number,
        reason: result.reason,
      });
    }
    return { attempted: true as const, ok: result.ok, reason: result.reason };
  } catch {
    await input.onError("order_confirmation_exception", {
      orderNumber: payload.number,
    });
    return { attempted: true as const, ok: false as const, reason: "FAILED" as const };
  }
}

export async function deliverOrderConfirmationForNumber(
  orderNumber: string,
  locale: Locale,
) {
  return sendOrderConfirmationIfNeeded({
    orderNumber,
    locale,
    loadLogs: () =>
      prisma.emailLog.findMany({
        where: {
          template: ORDER_CONFIRMATION_TEMPLATE,
          meta: { path: ["orderNumber"], equals: orderNumber },
        },
        select: { status: true, template: true },
        take: 30,
      }),
    loadPayload: async () => {
      const order = await prisma.order.findUnique({
        where: { number: orderNumber },
        select: {
          number: true,
          email: true,
          paymentMethod: true,
          currency: true,
          subtotal: true,
          shippingTotal: true,
          discountTotal: true,
          grandTotal: true,
          items: {
            select: {
              name: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
          shippingAddress: {
            select: {
              firstName: true,
              lastName: true,
              line1: true,
              line2: true,
              city: true,
            },
          },
        },
      });
      if (!order?.shippingAddress) return null;
      const address = order.shippingAddress;
      return {
        locale,
        number: order.number,
        email: order.email,
        firstName: address.firstName,
        lastName: address.lastName,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        subtotal: Number(order.subtotal),
        shippingTotal: Number(order.shippingTotal),
        discountTotal: Number(order.discountTotal),
        grandTotal: Number(order.grandTotal),
        currency: order.currency,
        paymentMethod: order.paymentMethod,
      };
    },
    send: sendTransactionalEmail,
    onError: (message, meta) =>
      logOps({
        level: "error",
        source: "checkout.email",
        message,
        meta,
      }),
  });
}
