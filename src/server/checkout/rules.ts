import { z } from "zod";

export const CHECKOUT_RATE_LIMIT = {
  email: { limit: 8, windowMs: 15 * 60_000 },
  ip: { limit: 12, windowMs: 15 * 60_000 },
} as const;

export const checkoutSchema = z.object({
  locale: z.enum(["fr", "en", "ar"]),
  email: z.email(),
  phone: z.string().min(8).max(30),
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  line1: z.string().min(5).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  region: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
  shippingMethodId: z.string().min(1),
  couponCode: z.string().max(40).optional(),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.literal("COD"),
  idempotencyKey: z.uuid(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function couponPriorUseWhere(
  couponCode: string,
  email: string,
  userId?: string | null,
) {
  return {
    couponCode,
    status: { not: "CANCELLED" as const },
    OR: userId ? [{ email }, { userId }] : [{ email }],
  };
}

export function exceedsPerUserLimit(priorCount: number, perUserLimit: number) {
  return priorCount >= perUserLimit;
}
