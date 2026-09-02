"use server";

import { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import { logOps } from "@/lib/ops-log";
import { restoreOrderStock } from "@/server/services/inventory";
import {
  addOrderNoteSchema,
  canTransitionOrderStatus,
  createRefundSchema,
  createReturnRequestSchema,
  updateOrderStatusSchema,
  updateReturnStatusSchema,
  updateTrackingSchema,
} from "@/server/validations/admin/order";

export type AdminActionResult = { success?: boolean; error?: string };

function revalidateOrder(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/returns");
}

function statusSideEffects(
  status: OrderStatus,
  current: { paymentStatus: string; paidAt: Date | null },
): Prisma.OrderUpdateInput {
  const data: Prisma.OrderUpdateInput = { status };
  if (status === "PAID") {
    data.paymentStatus = "PAID";
    if (!current.paidAt) data.paidAt = new Date();
  }
  if (status === "SHIPPED") {
    data.shippedAt = new Date();
  }
  if (status === "DELIVERED") {
    data.deliveredAt = new Date();
  }
  if (status === "CANCELLED") {
    data.paymentStatus =
      current.paymentStatus === "PAID" ? "REFUNDED" : "FAILED";
  }
  return data;
}

export async function updateOrderStatus(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("orders.manage");
  } catch (e) {
    return {
      error: e instanceof Error && e.message === "FORBIDDEN"
        ? "You do not have permission to manage orders."
        : "Unauthorized.",
    };
  }

  const { orderId, status, note } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new Error("NOT_FOUND");
      if (!canTransitionOrderStatus(order.status, status)) {
        throw new Error("INVALID_TRANSITION");
      }

      const wasCancelled = order.status === "CANCELLED";
      await tx.order.update({
        where: { id: orderId },
        data: statusSideEffects(status, order),
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          note: note ?? `Status changed to ${status}`,
          createdBy: user.id,
        },
      });

      if (status === "CANCELLED" && !wasCancelled) {
        await restoreOrderStock(tx, orderId, order.number);
      }
    });

    await writeAuditLog({
      userId: user.id,
      action: "order.status_update",
      entity: "Order",
      entityId: orderId,
      metadata: { status },
    });

    revalidateOrder(orderId);
    return { success: true };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return { error: "Order not found." };
    if (code === "INVALID_TRANSITION") {
      return { error: "This status transition is not allowed." };
    }
    await logOps({
      level: "error",
      source: "admin.orders",
      message: "status_update_failed",
      meta: { orderId },
    });
    return { error: "Could not update order status." };
  }
}

export async function addOrderNote(input: unknown): Promise<AdminActionResult> {
  const parsed = addOrderNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("orders.manage");
  } catch {
    return { error: "Unauthorized." };
  }

  const { orderId, body, isInternal } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return { error: "Order not found." };

  await prisma.orderNote.create({
    data: { orderId, body, isInternal, authorId: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    action: "order.note_add",
    entity: "Order",
    entityId: orderId,
  });

  revalidateOrder(orderId);
  return { success: true };
}

export async function updateTracking(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = updateTrackingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("orders.manage");
  } catch {
    return { error: "Unauthorized." };
  }

  const { orderId, trackingNumber, trackingUrl } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return { error: "Order not found." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        trackingUrl: trackingUrl || null,
        shippedAt: new Date(),
        ...(order.status === "PROCESSING" || order.status === "PAID"
          ? { status: "SHIPPED" as OrderStatus }
          : {}),
      },
    });

    if (order.status === "PROCESSING" || order.status === "PAID") {
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "SHIPPED",
          note: `Tracking added: ${trackingNumber}`,
          createdBy: user.id,
        },
      });
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "order.tracking_update",
    entity: "Order",
    entityId: orderId,
    metadata: { trackingNumber },
  });

  revalidateOrder(orderId);
  return { success: true };
}

export async function createRefund(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = createRefundSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("orders.refund");
  } catch {
    return { error: "Unauthorized." };
  }

  const { orderId, reason, amount, items } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          refunds: { include: { items: true } },
        },
      });
      if (!order) throw new Error("NOT_FOUND");
      if (["CANCELLED", "REFUNDED"].includes(order.status)) {
        throw new Error("INVALID_STATUS");
      }

      const alreadyRefunded = order.refunds.reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      );
      const orderTotal = Number(order.grandTotal);
      const remaining = orderTotal - alreadyRefunded;
      if (remaining <= 0) throw new Error("ALREADY_REFUNDED");

      let refundAmount = amount ?? remaining;
      const refundItems: {
        orderItemId: string;
        quantity: number;
        amount: number;
      }[] = [];

      if (items?.length) {
        refundAmount = 0;
        for (const item of items) {
          const orderItem = order.items.find((i) => i.id === item.orderItemId);
          if (!orderItem) throw new Error("INVALID_ITEM");
          if (item.quantity > orderItem.quantity) throw new Error("INVALID_QTY");
          refundAmount += item.amount;
          refundItems.push(item);
        }
      }

      if (refundAmount <= 0 || refundAmount > remaining) {
        throw new Error("INVALID_AMOUNT");
      }

      const isFull = Math.abs(refundAmount - remaining) < 0.01;
      const newStatus: OrderStatus = isFull
        ? "REFUNDED"
        : "PARTIALLY_REFUNDED";

      await tx.refund.create({
        data: {
          orderId,
          amount: new Prisma.Decimal(refundAmount),
          reason,
          status: "COMPLETED",
          items: refundItems.length
            ? {
                create: refundItems.map((item) => ({
                  orderItemId: item.orderItemId,
                  quantity: item.quantity,
                  amount: new Prisma.Decimal(item.amount),
                })),
              }
            : undefined,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          paymentStatus: isFull ? "REFUNDED" : order.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          note: `Refund issued: ${refundAmount.toFixed(2)} ${order.currency}. ${reason}`,
          createdBy: user.id,
        },
      });
    });

    await writeAuditLog({
      userId: user.id,
      action: "order.refund",
      entity: "Order",
      entityId: orderId,
      metadata: { reason },
    });

    revalidateOrder(orderId);
    return { success: true };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      NOT_FOUND: "Order not found.",
      INVALID_STATUS: "This order cannot be refunded.",
      ALREADY_REFUNDED: "Order has already been fully refunded.",
      INVALID_AMOUNT: "Refund amount is invalid.",
      INVALID_ITEM: "One or more items are invalid.",
      INVALID_QTY: "Refund quantity exceeds ordered quantity.",
    };
    return { error: messages[code] ?? "Could not process refund." };
  }
}

export async function createReturnRequest(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = createReturnRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("orders.refund");
  } catch {
    return { error: "Unauthorized." };
  }

  const { orderId, reason, notes, items } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "Order not found." };
  if (!["DELIVERED", "SHIPPED", "PARTIALLY_REFUNDED"].includes(order.status)) {
    return { error: "Returns are only allowed for shipped or delivered orders." };
  }

  for (const item of items) {
    const orderItem = order.items.find((i) => i.id === item.orderItemId);
    if (!orderItem || item.quantity > orderItem.quantity) {
      return { error: "Invalid return item or quantity." };
    }
  }

  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId,
      reason,
      notes,
      items: {
        create: items.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason,
        })),
      },
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "order.return_create",
    entity: "ReturnRequest",
    entityId: returnRequest.id,
    metadata: { orderId },
  });

  revalidateOrder(orderId);
  return { success: true };
}

export async function updateReturnStatus(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = updateReturnStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("orders.refund");
  } catch {
    return { error: "Unauthorized." };
  }

  const { returnId, status, notes } = parsed.data;
  const existing = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, orderId: true },
  });
  if (!existing) return { error: "Return request not found." };

  await prisma.returnRequest.update({
    where: { id: returnId },
    data: { status, notes: notes ?? undefined },
  });

  await writeAuditLog({
    userId: user.id,
    action: "return.status_update",
    entity: "ReturnRequest",
    entityId: returnId,
    metadata: { status },
  });

  revalidateOrder(existing.orderId);
  return { success: true };
}

export async function getOrdersForAdmin(filters?: {
  q?: string;
  status?: string;
  paymentStatus?: string;
}) {
  await assertPermission("orders.view");

  const where: Prisma.OrderWhereInput = {};
  if (filters?.status) {
    where.status = filters.status as OrderStatus;
  }
  if (filters?.paymentStatus) {
    where.paymentStatus = filters.paymentStatus as Prisma.EnumPaymentStatusFilter["equals"];
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.order.findMany({
    where,
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function getOrderByIdForAdmin(orderId: string) {
  await assertPermission("orders.view");

  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      shippingAddress: true,
      billingAddress: true,
      shippingMethod: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      orderNotes: {
        include: {
          author: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      refunds: { include: { items: true }, orderBy: { createdAt: "desc" } },
      returns: {
        include: { items: { include: { orderItem: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getReturnRequestsForAdmin() {
  await assertPermission("orders.refund");

  return prisma.returnRequest.findMany({
    include: {
      order: { select: { number: true, email: true, currency: true } },
      items: { include: { orderItem: { select: { name: true, sku: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
