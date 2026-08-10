import { z } from "zod";

const cuid = z.string().cuid();
const optionalDate = z.coerce.date().optional().nullable();
const decimal = z.coerce.number().min(0);
const optionalDecimal = z.coerce.number().min(0).optional().nullable();
const couponCode = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, hyphens or underscores");

export const createCouponSchema = z.object({
  code: couponCode,
  description: z.string().max(500).optional().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: decimal,
  minOrderAmount: optionalDecimal,
  maxDiscount: optionalDecimal,
  usageLimit: z.coerce.number().int().min(1).optional().nullable(),
  perUserLimit: z.coerce.number().int().min(1).default(1),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean().default(true),
});

export const updateCouponSchema = createCouponSchema.extend({
  id: cuid,
});

export const toggleCouponSchema = z.object({
  id: cuid,
  isActive: z.boolean(),
});

export const createGiftCardSchema = z.object({
  code: z.string().min(8).max(32),
  initialAmount: decimal,
  currency: z.string().length(3).default("MAD"),
  expiresAt: optionalDate,
  ownerId: cuid.optional().nullable(),
});

export const updateGiftCardSchema = z.object({
  id: cuid,
  balance: decimal.optional(),
  isActive: z.boolean(),
  expiresAt: optionalDate,
});

export const createCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["EMAIL", "NEWSLETTER", "PROMOTION"]).default("NEWSLETTER"),
  subject: z.string().min(2).max(200),
  body: z.string().min(1).max(50000),
  audience: z.record(z.string(), z.unknown()).optional().nullable(),
  scheduledAt: optionalDate,
});

export const updateCampaignSchema = createCampaignSchema.extend({
  id: cuid,
});

export const sendCampaignSchema = z.object({
  id: cuid,
});

export const createPopupSchema = z.object({
  name: z.string().min(2).max(120),
  content: z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    ctaLabel: z.string().max(80).optional().nullable(),
    ctaUrl: z.string().url().optional().nullable().or(z.literal("")),
  }),
  trigger: z.enum(["EXIT_INTENT", "DELAY", "SCROLL", "IMMEDIATE"]),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean().default(true),
});

export const updatePopupSchema = createPopupSchema.extend({
  id: cuid,
});

export const togglePopupSchema = z.object({
  id: cuid,
  isActive: z.boolean(),
});

export const createFlashSaleSchema = z.object({
  name: z.string().min(2).max(120),
  productId: cuid.optional().nullable(),
  collectionId: cuid.optional().nullable(),
  salePrice: optionalDecimal,
  percentOff: z.coerce.number().min(0).max(100).optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true),
});

export const updateFlashSaleSchema = createFlashSaleSchema.extend({
  id: cuid,
});

export const createDiscountRuleSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING", "BUNDLE"]),
  value: decimal,
  conditions: z.record(z.string(), z.unknown()).optional().nullable(),
  stackable: z.boolean().default(false),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean().default(true),
});

export const updateDiscountRuleSchema = createDiscountRuleSchema.extend({
  id: cuid,
});

export const adjustLoyaltyPointsSchema = z.object({
  accountId: cuid,
  delta: z.coerce.number().int().refine((v) => v !== 0, "Delta must not be zero"),
  reason: z.string().min(2).max(500),
});

export const createReferralCodeSchema = z.object({
  userId: cuid,
  code: z
    .string()
    .min(4)
    .max(24)
    .regex(/^[A-Z0-9]+$/, "Code must be uppercase alphanumeric")
    .optional(),
  rewardPoints: z.coerce.number().int().min(0).default(100),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type CreateGiftCardInput = z.infer<typeof createGiftCardSchema>;
export type UpdateGiftCardInput = z.infer<typeof updateGiftCardSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreatePopupInput = z.infer<typeof createPopupSchema>;
export type UpdatePopupInput = z.infer<typeof updatePopupSchema>;
export type CreateFlashSaleInput = z.infer<typeof createFlashSaleSchema>;
export type UpdateFlashSaleInput = z.infer<typeof updateFlashSaleSchema>;
export type CreateDiscountRuleInput = z.infer<typeof createDiscountRuleSchema>;
export type UpdateDiscountRuleInput = z.infer<typeof updateDiscountRuleSchema>;
export type AdjustLoyaltyPointsInput = z.infer<typeof adjustLoyaltyPointsSchema>;
export type CreateReferralCodeInput = z.infer<typeof createReferralCodeSchema>;
