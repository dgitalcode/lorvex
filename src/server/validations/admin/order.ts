import { z } from "zod";
import type { OrderStatus, ReturnStatus } from "@prisma/client";

export const orderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: orderStatusSchema,
  note: z.string().max(500).optional(),
});

export const addOrderNoteSchema = z.object({
  orderId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().default(true),
});

export const updateTrackingSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().trim().min(1).max(120),
  trackingUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export const refundItemSchema = z.object({
  orderItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  amount: z.number().min(0),
});

export const createRefundSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
  amount: z.number().min(0.01).optional(),
  items: z.array(refundItemSchema).optional(),
});

export const returnItemSchema = z.object({
  orderItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  reason: z.string().max(300).optional(),
});

export const createReturnRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
  notes: z.string().max(2000).optional(),
  items: z.array(returnItemSchema).min(1),
});

export const updateReturnStatusSchema = z.object({
  returnId: z.string().min(1),
  status: z.enum([
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "RECEIVED",
    "REFUNDED",
  ] satisfies ReturnStatus[]),
  notes: z.string().max(2000).optional(),
});

const TERMINAL_STATUSES: OrderStatus[] = [
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

const FORWARD_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ["PAID", "PROCESSING"],
  PAID: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

export function getAllowedOrderTransitions(
  current: OrderStatus,
): OrderStatus[] {
  if (TERMINAL_STATUSES.includes(current)) return [];
  const forward = FORWARD_TRANSITIONS[current] ?? [];
  return [...forward, "CANCELLED"];
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false;
  if (to === "CANCELLED") return !TERMINAL_STATUSES.includes(from);
  return getAllowedOrderTransitions(from).includes(to);
}
