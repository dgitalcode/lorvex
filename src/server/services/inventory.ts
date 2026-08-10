import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function restoreOrderStock(
  tx: Tx,
  orderId: string,
  orderNumber: string,
) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        delta: item.quantity,
        reason: "ORDER_CANCELLED",
        reference: orderNumber,
      },
    });
  }
}
