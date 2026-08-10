"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/format";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  adjustLoyaltyPointsSchema,
  createCampaignSchema,
  createCouponSchema,
  createDiscountRuleSchema,
  createFlashSaleSchema,
  createGiftCardSchema,
  createPopupSchema,
  createReferralCodeSchema,
  sendCampaignSchema,
  toggleCouponSchema,
  togglePopupSchema,
  updateCampaignSchema,
  updateCouponSchema,
  updateDiscountRuleSchema,
  updateFlashSaleSchema,
  updateGiftCardSchema,
  updatePopupSchema,
  type AdjustLoyaltyPointsInput,
  type CreateCampaignInput,
  type CreateCouponInput,
  type CreateDiscountRuleInput,
  type CreateFlashSaleInput,
  type CreateGiftCardInput,
  type CreatePopupInput,
  type CreateReferralCodeInput,
  type UpdateCampaignInput,
  type UpdateCouponInput,
  type UpdateDiscountRuleInput,
  type UpdateFlashSaleInput,
  type UpdateGiftCardInput,
  type UpdatePopupInput,
} from "@/server/validations/admin/marketing";

export type MarketingActionResult =
  | { ok: true; id?: string; count?: number }
  | { ok: false; error?: string; reason?: "NOT_CONFIGURED" | "FAILED" };

const MARKETING_PATHS = [
  "/admin/marketing/coupons",
  "/admin/marketing/gift-cards",
  "/admin/marketing/campaigns",
  "/admin/marketing/popups",
  "/admin/marketing/loyalty",
  "/admin/marketing/abandoned",
  "/admin/marketing/discounts",
] as const;

function revalidateMarketing() {
  for (const path of MARKETING_PATHS) {
    revalidatePath(path);
  }
}

function actionError(error: unknown): MarketingActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { ok: false, error: "A record with this code already exists." };
    }
    if (error.code === "P2025") {
      return { ok: false, error: "Record not found." };
    }
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return { ok: false, error: "Unauthorized." };
    if (error.message === "FORBIDDEN") return { ok: false, error: "Forbidden." };
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong." };
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function randomReferralCode() {
  return `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

type CartSnapshotItem = {
  productId: string;
  variantId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

function computeCartSnapshot(
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    product: { name: string; basePrice: Prisma.Decimal; currency: string };
    variant: { name: string; price: Prisma.Decimal | null };
  }>,
) {
  let total = 0;
  const currency = items[0]?.product.currency ?? "MAD";
  const snapshotItems: CartSnapshotItem[] = items.map((item) => {
    const unitPrice = Number(item.variant.price ?? item.product.basePrice);
    total += unitPrice * item.quantity;
    return {
      productId: item.productId,
      variantId: item.variantId,
      name: `${item.product.name} — ${item.variant.name}`,
      quantity: item.quantity,
      unitPrice,
    };
  });
  return { total, currency, snapshotItems };
}

export async function createCoupon(input: CreateCouponInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createCouponSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: emptyToNull(data.description),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        perUserLimit: data.perUserLimit,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.coupon.create",
      entity: "Coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code },
    });

    revalidateMarketing();
    return { ok: true, id: coupon.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCoupon(input: UpdateCouponInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = updateCouponSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const coupon = await prisma.coupon.update({
      where: { id: data.id },
      data: {
        code: data.code.toUpperCase(),
        description: emptyToNull(data.description),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        perUserLimit: data.perUserLimit,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.coupon.update",
      entity: "Coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code },
    });

    revalidateMarketing();
    return { ok: true, id: coupon.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleCoupon(input: unknown): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = toggleCouponSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const coupon = await prisma.coupon.update({
      where: { id: parsed.data.id },
      data: { isActive: parsed.data.isActive },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.coupon.toggle",
      entity: "Coupon",
      entityId: coupon.id,
      metadata: { isActive: coupon.isActive },
    });

    revalidateMarketing();
    return { ok: true, id: coupon.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createGiftCard(input: CreateGiftCardInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createGiftCardSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const giftCard = await prisma.giftCard.create({
      data: {
        code: data.code.toUpperCase(),
        initialAmount: data.initialAmount,
        balance: data.initialAmount,
        currency: data.currency,
        expiresAt: data.expiresAt ?? null,
        ownerId: data.ownerId ?? null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.gift_card.create",
      entity: "GiftCard",
      entityId: giftCard.id,
      metadata: { code: giftCard.code, amount: Number(giftCard.initialAmount) },
    });

    revalidateMarketing();
    return { ok: true, id: giftCard.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateGiftCard(input: UpdateGiftCardInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = updateGiftCardSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const giftCard = await prisma.giftCard.update({
      where: { id: data.id },
      data: {
        ...(data.balance !== undefined ? { balance: data.balance } : {}),
        isActive: data.isActive,
        expiresAt: data.expiresAt ?? null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.gift_card.update",
      entity: "GiftCard",
      entityId: giftCard.id,
      metadata: { code: giftCard.code, balance: Number(giftCard.balance) },
    });

    revalidateMarketing();
    return { ok: true, id: giftCard.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createCampaign(input: CreateCampaignInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createCampaignSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const campaign = await prisma.marketingCampaign.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
        subject: data.subject,
        body: data.body,
        audience: (data.audience ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        scheduledAt: data.scheduledAt ?? null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.campaign.create",
      entity: "MarketingCampaign",
      entityId: campaign.id,
      metadata: { name: campaign.name },
    });

    revalidateMarketing();
    return { ok: true, id: campaign.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCampaign(input: UpdateCampaignInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = updateCampaignSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const campaign = await prisma.marketingCampaign.update({
      where: { id: data.id },
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
        audience: (data.audience ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        scheduledAt: data.scheduledAt ?? null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.campaign.update",
      entity: "MarketingCampaign",
      entityId: campaign.id,
      metadata: { name: campaign.name },
    });

    revalidateMarketing();
    return { ok: true, id: campaign.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function sendCampaign(input: unknown): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = sendCampaignSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    if (!isEmailConfigured()) {
      return { ok: false, reason: "NOT_CONFIGURED", error: "Email is not configured." };
    }

    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: parsed.data.id },
    });
    if (!campaign) return { ok: false, error: "Campaign not found." };
    if (!campaign.subject || !campaign.body) {
      return { ok: false, error: "Campaign must have a subject and body." };
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { email: true },
    });

    if (!subscribers.length) {
      return { ok: false, error: "No active newsletter subscribers." };
    }

    let sent = 0;
    let failed = 0;
    const emails = subscribers.map((s) => s.email);

    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50);
      const results = await Promise.all(
        batch.map((to) =>
          sendTransactionalEmail({
            to,
            subject: campaign.subject!,
            html: campaign.body!,
            template: "marketing_campaign",
            meta: { campaignId: campaign.id, campaignName: campaign.name },
          }),
        ),
      );
      for (const result of results) {
        if (result.ok) sent += 1;
        else failed += 1;
      }
    }

    const status = failed === emails.length ? "FAILED" : "SENT";
    await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: {
        status,
        sentAt: new Date(),
        stats: { sent, failed, total: emails.length },
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.campaign.send",
      entity: "MarketingCampaign",
      entityId: campaign.id,
      metadata: { sent, failed, total: emails.length },
    });

    revalidateMarketing();
    return { ok: true, id: campaign.id, count: sent };
  } catch (error) {
    return actionError(error);
  }
}

export async function createPopup(input: CreatePopupInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createPopupSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const popup = await prisma.popupCampaign.create({
      data: {
        name: data.name,
        content: data.content,
        trigger: data.trigger,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.popup.create",
      entity: "PopupCampaign",
      entityId: popup.id,
      metadata: { name: popup.name },
    });

    revalidateMarketing();
    return { ok: true, id: popup.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updatePopup(input: UpdatePopupInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = updatePopupSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const popup = await prisma.popupCampaign.update({
      where: { id: data.id },
      data: {
        name: data.name,
        content: data.content,
        trigger: data.trigger,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.popup.update",
      entity: "PopupCampaign",
      entityId: popup.id,
      metadata: { name: popup.name },
    });

    revalidateMarketing();
    return { ok: true, id: popup.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function togglePopup(input: unknown): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = togglePopupSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const popup = await prisma.popupCampaign.update({
      where: { id: parsed.data.id },
      data: { isActive: parsed.data.isActive },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.popup.toggle",
      entity: "PopupCampaign",
      entityId: popup.id,
      metadata: { isActive: popup.isActive },
    });

    revalidateMarketing();
    return { ok: true, id: popup.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createFlashSale(input: CreateFlashSaleInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createFlashSaleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    if (!data.productId && !data.collectionId) {
      return { ok: false, error: "Select a product or collection." };
    }
    if (data.endsAt <= data.startsAt) {
      return { ok: false, error: "End date must be after start date." };
    }

    const flashSale = await prisma.flashSale.create({
      data: {
        name: data.name,
        productId: data.productId ?? null,
        collectionId: data.collectionId ?? null,
        salePrice: data.salePrice ?? null,
        percentOff: data.percentOff ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.flash_sale.create",
      entity: "FlashSale",
      entityId: flashSale.id,
      metadata: { name: flashSale.name },
    });

    revalidateMarketing();
    return { ok: true, id: flashSale.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateFlashSale(input: UpdateFlashSaleInput): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = updateFlashSaleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    if (!data.productId && !data.collectionId) {
      return { ok: false, error: "Select a product or collection." };
    }
    if (data.endsAt <= data.startsAt) {
      return { ok: false, error: "End date must be after start date." };
    }

    const flashSale = await prisma.flashSale.update({
      where: { id: data.id },
      data: {
        name: data.name,
        productId: data.productId ?? null,
        collectionId: data.collectionId ?? null,
        salePrice: data.salePrice ?? null,
        percentOff: data.percentOff ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.flash_sale.update",
      entity: "FlashSale",
      entityId: flashSale.id,
      metadata: { name: flashSale.name },
    });

    revalidateMarketing();
    return { ok: true, id: flashSale.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createDiscountRule(
  input: CreateDiscountRuleInput,
): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createDiscountRuleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const rule = await prisma.discountRule.create({
      data: {
        name: data.name,
        type: data.type,
        value: data.value,
        conditions: (data.conditions ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        stackable: data.stackable,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.discount_rule.create",
      entity: "DiscountRule",
      entityId: rule.id,
      metadata: { name: rule.name },
    });

    revalidateMarketing();
    return { ok: true, id: rule.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateDiscountRule(
  input: UpdateDiscountRuleInput,
): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = updateDiscountRuleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const rule = await prisma.discountRule.update({
      where: { id: data.id },
      data: {
        name: data.name,
        type: data.type,
        value: data.value,
        conditions: (data.conditions ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        stackable: data.stackable,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: data.isActive,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.discount_rule.update",
      entity: "DiscountRule",
      entityId: rule.id,
      metadata: { name: rule.name },
    });

    revalidateMarketing();
    return { ok: true, id: rule.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function snapshotAbandonedCarts(): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const carts = await prisma.cart.findMany({
      where: {
        status: "ACTIVE",
        items: {
          some: { updatedAt: { lt: oneHourAgo } },
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, basePrice: true, currency: true } },
            variant: { select: { id: true, name: true, price: true } },
          },
        },
        user: { select: { id: true, email: true } },
      },
    });

    let upserted = 0;
    for (const cart of carts) {
      if (!cart.items.length) continue;

      const { total, currency, snapshotItems } = computeCartSnapshot(cart.items);

      const email = cart.user?.email ?? null;
      const existing = await prisma.abandonedCartSnapshot.findFirst({
        where: { cartId: cart.id, recovered: false },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        await prisma.abandonedCartSnapshot.update({
          where: { id: existing.id },
          data: {
            email,
            userId: cart.userId,
            items: snapshotItems,
            total,
            currency,
          },
        });
      } else {
        await prisma.abandonedCartSnapshot.create({
          data: {
            cartId: cart.id,
            email,
            userId: cart.userId,
            items: snapshotItems,
            total,
            currency,
          },
        });
      }
      upserted += 1;
    }

    await writeAuditLog({
      userId: user.id,
      action: "marketing.abandoned_cart.snapshot",
      entity: "AbandonedCartSnapshot",
      metadata: { count: upserted },
    });

    revalidateMarketing();
    return { ok: true, count: upserted };
  } catch (error) {
    return actionError(error);
  }
}

export async function sendAbandonedCartReminders(): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");

    if (!isEmailConfigured()) {
      return { ok: false, reason: "NOT_CONFIGURED", error: "Email is not configured." };
    }

    const snapshots = await prisma.abandonedCartSnapshot.findMany({
      where: {
        recovered: false,
        remindedAt: null,
        email: { not: null },
      },
      take: 200,
      orderBy: { createdAt: "asc" },
    });

    if (!snapshots.length) {
      return { ok: false, error: "No abandoned carts with email to remind." };
    }

    let sent = 0;
    for (let i = 0; i < snapshots.length; i += 50) {
      const batch = snapshots.slice(i, i + 50);
      const results = await Promise.all(
        batch.map(async (snapshot) => {
          const items = snapshot.items as CartSnapshotItem[];
          const itemLines = items
            .map(
              (item) =>
                `<li>${item.name} × ${item.quantity} — ${item.unitPrice.toFixed(2)} ${snapshot.currency}</li>`,
            )
            .join("");
          const result = await sendTransactionalEmail({
            to: snapshot.email!,
            subject: "You left items in your cart — LORVEX",
            html: `
              <p>We noticed you left luxury timepieces in your cart.</p>
              <ul>${itemLines}</ul>
              <p><strong>Total: ${Number(snapshot.total).toFixed(2)} ${snapshot.currency}</strong></p>
              <p><a href="${absoluteUrl("/fr/cart")}">Complete your order</a></p>
            `,
            template: "abandoned_cart",
            meta: { snapshotId: snapshot.id },
          });
          return { snapshot, result };
        }),
      );

      for (const { snapshot, result } of results) {
        if (result.ok) {
          sent += 1;
          await prisma.abandonedCartSnapshot.update({
            where: { id: snapshot.id },
            data: { remindedAt: new Date() },
          });
        }
      }
    }

    await writeAuditLog({
      userId: user.id,
      action: "marketing.abandoned_cart.remind",
      entity: "AbandonedCartSnapshot",
      metadata: { sent, total: snapshots.length },
    });

    revalidateMarketing();
    return { ok: true, count: sent };
  } catch (error) {
    return actionError(error);
  }
}

export async function adjustLoyaltyPoints(
  input: AdjustLoyaltyPointsInput,
): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = adjustLoyaltyPointsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const { accountId, delta, reason } = parsed.data;

    const account = await prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return { ok: false, error: "Loyalty account not found." };

    const newPoints = account.points + delta;
    if (newPoints < 0) {
      return { ok: false, error: "Insufficient points for this adjustment." };
    }

    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: accountId },
        data: { points: newPoints },
      }),
      prisma.loyaltyTransaction.create({
        data: { accountId, delta, reason },
      }),
    ]);

    await writeAuditLog({
      userId: user.id,
      action: "marketing.loyalty.adjust",
      entity: "LoyaltyAccount",
      entityId: accountId,
      metadata: { delta, reason, newPoints },
    });

    revalidateMarketing();
    return { ok: true, id: accountId };
  } catch (error) {
    return actionError(error);
  }
}

export async function createReferralCode(
  input: CreateReferralCodeInput,
): Promise<MarketingActionResult> {
  try {
    const user = await assertPermission("marketing.manage");
    const parsed = createReferralCodeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const customer = await prisma.user.findFirst({
      where: { id: data.userId, role: "CUSTOMER" },
      select: { id: true },
    });
    if (!customer) return { ok: false, error: "Customer not found." };

    const existingForUser = await prisma.referralCode.findFirst({
      where: { userId: data.userId },
    });
    if (existingForUser) {
      return { ok: false, error: "Customer already has a referral code." };
    }

    let code = data.code?.toUpperCase() ?? randomReferralCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taken = await prisma.referralCode.findUnique({ where: { code } });
      if (!taken) break;
      code = randomReferralCode();
    }

    const referral = await prisma.referralCode.create({
      data: {
        userId: data.userId,
        code,
        rewardPoints: data.rewardPoints,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "marketing.referral.create",
      entity: "ReferralCode",
      entityId: referral.id,
      metadata: { code: referral.code, userId: data.userId },
    });

    revalidateMarketing();
    return { ok: true, id: referral.id };
  } catch (error) {
    return actionError(error);
  }
}
