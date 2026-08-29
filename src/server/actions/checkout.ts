"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp, hashToken } from "@/server/services/security";
import {
  generateOrderAccessToken,
  hashOrderAccessToken,
} from "@/server/services/order-access";
import {
  CHECKOUT_RATE_LIMIT,
  checkoutSchema,
  couponPriorUseWhere,
  exceedsPerUserLimit,
} from "@/server/checkout/rules";

export type CheckoutState = {
  error?: string;
  success?: boolean;
  number?: string;
  accessToken?: string;
};

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto
    .getRandomValues(new Uint32Array(1))[0]
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")
    .slice(-4);
  return `LX-${date}-${random}`;
}

async function existingOrderForIdempotency(keyHash: string) {
  return prisma.order.findUnique({
    where: { idempotencyKeyHash: keyHash },
    select: { number: true },
  });
}

export async function createOrder(
  _state: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Your cart could not be read. Please refresh and try again." };
  }
  const parsed = checkoutSchema.safeParse({
    locale: formData.get("locale"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    region: formData.get("region") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    shippingMethodId: formData.get("shippingMethodId"),
    couponCode: formData.get("couponCode") || undefined,
    notes: formData.get("notes") || undefined,
    paymentMethod: formData.get("paymentMethod"),
    idempotencyKey: formData.get("idempotencyKey"),
    items: rawItems,
  });
  if (!parsed.success) {
    const paymentIssue = parsed.error.issues.find((issue) =>
      issue.path.includes("paymentMethod"),
    );
    if (paymentIssue) {
      return { error: "Card payment is not available. Please use cash on delivery." };
    }
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const ip = await getClientIp();
  const emailLimit = await checkRateLimit({
    key: `checkout:email:${email}`,
    limit: CHECKOUT_RATE_LIMIT.email.limit,
    windowMs: CHECKOUT_RATE_LIMIT.email.windowMs,
  });
  const ipLimit = await checkRateLimit({
    key: `checkout:ip:${ip}`,
    limit: CHECKOUT_RATE_LIMIT.ip.limit,
    windowMs: CHECKOUT_RATE_LIMIT.ip.windowMs,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return {
      error: "Too many checkout attempts. Please wait a few minutes and try again.",
    };
  }

  const idempotencyKeyHash = hashToken(data.idempotencyKey);
  const replay = await existingOrderForIdempotency(idempotencyKeyHash);
  if (replay) {
    return { success: true, number: replay.number };
  }

  const session = await auth();
  const accessToken = generateOrderAccessToken();
  const accessTokenHash = hashOrderAccessToken(accessToken);

  try {
    const number = await prisma.$transaction(
      async (tx) => {
        const shipping = await tx.shippingMethod.findFirst({
          where: { id: data.shippingMethodId, isActive: true },
        });
        if (!shipping) throw new Error("SHIPPING");
        const ids = [...new Set(data.items.map((item) => item.variantId))];
        const variants = await tx.productVariant.findMany({
          where: { id: { in: ids }, product: { status: "ACTIVE" } },
          include: {
            product: {
              include: {
                media: {
                  where: { type: "IMAGE" },
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  take: 1,
                },
              },
            },
          },
        });
        if (variants.length !== ids.length) throw new Error("PRODUCT");
        const quantities = new Map<string, number>();
        for (const item of data.items) {
          quantities.set(
            item.variantId,
            (quantities.get(item.variantId) ?? 0) + item.quantity,
          );
        }

        let subtotal = 0;
        const lines = variants.map((variant) => {
          const quantity = quantities.get(variant.id) ?? 0;
          if (quantity < 1 || variant.stock < quantity) throw new Error("STOCK");
          const price = Number(variant.price ?? variant.product.basePrice);
          subtotal += price * quantity;
          return { variant, quantity, price };
        });

        let discount = 0;
        let coupon: Awaited<ReturnType<typeof tx.coupon.findUnique>> = null;
        const couponCode = data.couponCode?.trim().toUpperCase();
        if (couponCode) {
          coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
          const now = new Date();
          const valid =
            coupon?.isActive &&
            (!coupon.startsAt || coupon.startsAt <= now) &&
            (!coupon.endsAt || coupon.endsAt >= now) &&
            (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) &&
            (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount));
          if (!valid || !coupon) throw new Error("COUPON");
          const priorUses = await tx.order.count({
            where: couponPriorUseWhere(
              couponCode,
              email,
              session?.user?.id ?? null,
            ),
          });
          if (exceedsPerUserLimit(priorUses, coupon.perUserLimit)) {
            throw new Error("COUPON");
          }
          if (coupon.type === "PERCENTAGE")
            discount = (subtotal * Number(coupon.value)) / 100;
          if (coupon.type === "FIXED") discount = Number(coupon.value);
          if (coupon.maxDiscount)
            discount = Math.min(discount, Number(coupon.maxDiscount));
        }
        const shippingTotal =
          coupon?.type === "FREE_SHIPPING" ? 0 : Number(shipping.price);
        const address = await tx.address.create({
          data: {
            userId: session?.user?.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            line1: data.line1,
            line2: data.line2,
            city: data.city,
            region: data.region,
            postalCode: data.postalCode,
            country: "MA",
          },
        });
        const number = orderNumber();
        await tx.order.create({
          data: {
            number,
            userId: session?.user?.id,
            email,
            phone: data.phone,
            paymentMethod: "COD",
            subtotal: new Prisma.Decimal(subtotal),
            discountTotal: new Prisma.Decimal(discount),
            shippingTotal: shipping.price,
            grandTotal: new Prisma.Decimal(
              Math.max(0, subtotal - discount + shippingTotal),
            ),
            currency: variants[0].product.currency,
            couponCode,
            shippingMethodId: shipping.id,
            notes: data.notes,
            shippingAddressId: address.id,
            accessTokenHash,
            idempotencyKeyHash,
            items: {
              create: lines.map(({ variant, quantity, price }) => ({
                productId: variant.productId,
                variantId: variant.id,
                name: variant.product.name,
                sku: variant.sku,
                imageUrl: variant.imageUrl ?? variant.product.media[0]?.url,
                unitPrice: new Prisma.Decimal(price),
                quantity,
                totalPrice: new Prisma.Decimal(price * quantity),
              })),
            },
            statusHistory: { create: { status: "PENDING", note: "Order placed" } },
          },
        });
        for (const { variant, quantity } of lines) {
          const changed = await tx.productVariant.updateMany({
            where: { id: variant.id, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (changed.count !== 1) throw new Error("STOCK");
          await tx.inventoryMovement.create({
            data: {
              variantId: variant.id,
              delta: -quantity,
              reason: "ORDER",
              reference: number,
            },
          });
        }
        if (coupon)
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } },
          });
        return number;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { success: true, number, accessToken };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await existingOrderForIdempotency(idempotencyKeyHash);
      if (replay) return { success: true, number: replay.number };
    }
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      STOCK: "One of your watches is no longer available in the requested quantity.",
      PRODUCT: "A product in your cart is no longer available.",
      SHIPPING: "Please choose an available shipping method.",
      COUPON: "This coupon is invalid or no longer available.",
    };
    return {
      error: messages[code] ?? "We could not place your order. Please try again.",
    };
  }
}
