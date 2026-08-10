"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const checkoutSchema = z.object({
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
  paymentMethod: z.enum(["COD", "CARD"]),
  items: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1).max(20),
});

export type CheckoutState = { error?: string; success?: boolean; number?: string };

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `LX-${date}-${random}`;
}

export async function createOrder(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  let rawItems: unknown;
  try { rawItems = JSON.parse(String(formData.get("items") ?? "[]")); }
  catch { return { error: "Your cart could not be read. Please refresh and try again." }; }
  const parsed = checkoutSchema.safeParse({
    locale: formData.get("locale"), email: formData.get("email"), phone: formData.get("phone"),
    firstName: formData.get("firstName"), lastName: formData.get("lastName"), line1: formData.get("line1"),
    line2: formData.get("line2") || undefined, city: formData.get("city"), region: formData.get("region") || undefined,
    postalCode: formData.get("postalCode") || undefined, shippingMethodId: formData.get("shippingMethodId"),
    couponCode: formData.get("couponCode") || undefined, notes: formData.get("notes") || undefined,
    paymentMethod: formData.get("paymentMethod"), items: rawItems,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const data = parsed.data;
  const session = await auth();
  try {
    const number = await prisma.$transaction(async (tx) => {
      const shipping = await tx.shippingMethod.findFirst({ where: { id: data.shippingMethodId, isActive: true } });
      if (!shipping) throw new Error("SHIPPING");
      const ids = [...new Set(data.items.map((item) => item.variantId))];
      const variants = await tx.productVariant.findMany({
        where: { id: { in: ids }, product: { status: "ACTIVE" } },
        include: { product: { include: { media: { where: { type: "IMAGE" }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 } } } },
      });
      if (variants.length !== ids.length) throw new Error("PRODUCT");
      const quantities = new Map<string, number>();
      for (const item of data.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);

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
        const valid = coupon?.isActive && (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.endsAt || coupon.endsAt >= now) &&
          (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) && (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount));
        if (!valid || !coupon) throw new Error("COUPON");
        if (coupon.type === "PERCENTAGE") discount = subtotal * Number(coupon.value) / 100;
        if (coupon.type === "FIXED") discount = Number(coupon.value);
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
      }
      const shippingTotal = coupon?.type === "FREE_SHIPPING" ? 0 : Number(shipping.price);
      const address = await tx.address.create({ data: {
        userId: session?.user?.id, firstName: data.firstName, lastName: data.lastName, phone: data.phone,
        line1: data.line1, line2: data.line2, city: data.city, region: data.region,
        postalCode: data.postalCode, country: "MA",
      } });
      const number = orderNumber();
      await tx.order.create({ data: {
        number, userId: session?.user?.id, email: data.email.toLowerCase(), phone: data.phone,
        paymentMethod: data.paymentMethod, subtotal: new Prisma.Decimal(subtotal),
        discountTotal: new Prisma.Decimal(discount), shippingTotal: shipping.price,
        grandTotal: new Prisma.Decimal(Math.max(0, subtotal - discount + shippingTotal)),
        currency: variants[0].product.currency, couponCode, shippingMethodId: shipping.id,
        notes: data.notes, shippingAddressId: address.id,
        items: { create: lines.map(({ variant, quantity, price }) => ({
          productId: variant.productId, variantId: variant.id, name: variant.product.name,
          sku: variant.sku, imageUrl: variant.imageUrl ?? variant.product.media[0]?.url,
          unitPrice: new Prisma.Decimal(price), quantity, totalPrice: new Prisma.Decimal(price * quantity),
        })) },
        statusHistory: { create: { status: "PENDING", note: "Order placed" } },
      } });
      for (const { variant, quantity } of lines) {
        const changed = await tx.productVariant.updateMany({ where: { id: variant.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (changed.count !== 1) throw new Error("STOCK");
        await tx.inventoryMovement.create({ data: { variantId: variant.id, delta: -quantity, reason: "ORDER", reference: number } });
      }
      if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { usageCount: { increment: 1 } } });
      return number;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { success: true, number };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      STOCK: "One of your watches is no longer available in the requested quantity.",
      PRODUCT: "A product in your cart is no longer available.",
      SHIPPING: "Please choose an available shipping method.",
      COUPON: "This coupon is invalid or no longer available.",
    };
    return { error: messages[code] ?? "We could not place your order. Please try again." };
  }
}
