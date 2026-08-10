"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  createCustomerTagSchema,
  customerTagActionSchema,
  updateCustomerStatusSchema,
} from "@/server/validations/admin/customer";

export type AdminActionResult = { success?: boolean; error?: string };

export async function updateCustomerStatus(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = updateCustomerStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("customers.manage");
  } catch {
    return { error: "Unauthorized." };
  }

  const { userId, status } = parsed.data;
  const customer = await prisma.user.findFirst({
    where: { id: userId, role: "CUSTOMER" },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found." };

  await prisma.user.update({ where: { id: userId }, data: { status } });

  await writeAuditLog({
    userId: user.id,
    action: "customer.status_update",
    entity: "User",
    entityId: userId,
    metadata: { status },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);
  return { success: true };
}

export async function createCustomerTag(
  input: unknown,
): Promise<AdminActionResult & { tagId?: string }> {
  const parsed = createCustomerTagSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("customers.manage");
  } catch {
    return { error: "Unauthorized." };
  }

  const { name, color } = parsed.data;
  const slug = slugify(name);
  const existing = await prisma.customerTag.findUnique({ where: { slug } });
  if (existing) return { error: "A tag with this name already exists." };

  const tag = await prisma.customerTag.create({
    data: { name, slug, color },
  });

  await writeAuditLog({
    userId: user.id,
    action: "customer_tag.create",
    entity: "CustomerTag",
    entityId: tag.id,
    metadata: { name },
  });

  revalidatePath("/admin/customers");
  return { success: true, tagId: tag.id };
}

export async function addCustomerTag(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = customerTagActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("customers.manage");
  } catch {
    return { error: "Unauthorized." };
  }

  const { userId, tagId } = parsed.data;
  const customer = await prisma.user.findFirst({
    where: { id: userId, role: "CUSTOMER" },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found." };

  const tag = await prisma.customerTag.findUnique({ where: { id: tagId } });
  if (!tag) return { error: "Tag not found." };

  await prisma.customerTagAssignment.upsert({
    where: { userId_tagId: { userId, tagId } },
    create: { userId, tagId },
    update: {},
  });

  await writeAuditLog({
    userId: user.id,
    action: "customer.tag_add",
    entity: "User",
    entityId: userId,
    metadata: { tagId, tagName: tag.name },
  });

  revalidatePath(`/admin/customers/${userId}`);
  return { success: true };
}

export async function removeCustomerTag(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = customerTagActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await assertPermission("customers.manage");
  } catch {
    return { error: "Unauthorized." };
  }

  const { userId, tagId } = parsed.data;

  await prisma.customerTagAssignment.deleteMany({
    where: { userId, tagId },
  });

  await writeAuditLog({
    userId: user.id,
    action: "customer.tag_remove",
    entity: "User",
    entityId: userId,
    metadata: { tagId },
  });

  revalidatePath(`/admin/customers/${userId}`);
  return { success: true };
}

export async function getCustomersForAdmin(filters?: { q?: string; status?: string }) {
  await assertPermission("customers.view");

  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (filters?.status) {
    where.status = filters.status as Prisma.EnumUserStatusFilter["equals"];
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      _count: { select: { orders: true } },
      orders: {
        where: { status: { notIn: ["CANCELLED", "PENDING"] } },
        select: { grandTotal: true, currency: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return customers.map((c) => ({
    id: c.id,
    email: c.email,
    name: c.name ?? (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email),
    status: c.status,
    createdAt: c.createdAt,
    orderCount: c._count.orders,
    ltv: c.orders.reduce((sum, o) => sum + Number(o.grandTotal), 0),
    currency: c.orders[0]?.currency ?? "MAD",
  }));
}

export async function getCustomerByIdForAdmin(userId: string) {
  await assertPermission("customers.view");

  const customer = await prisma.user.findFirst({
    where: { id: userId, role: "CUSTOMER" },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          number: true,
          status: true,
          grandTotal: true,
          currency: true,
          createdAt: true,
        },
      },
      _count: { select: { orders: true } },
      wishlistItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              currency: true,
              media: {
                where: { type: "IMAGE" },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      customerTags: { include: { tag: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      analyticsEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!customer) return null;

  const ltvAgg = await prisma.order.aggregate({
    where: {
      userId,
      status: { notIn: ["CANCELLED", "PENDING"] },
    },
    _sum: { grandTotal: true },
  });

  return {
    ...customer,
    ltv: Number(ltvAgg._sum.grandTotal ?? 0),
    orderCount: customer._count.orders,
  };
}

export async function getCustomerTagsForAdmin() {
  await assertPermission("customers.view");
  return prisma.customerTag.findMany({ orderBy: { name: "asc" } });
}
