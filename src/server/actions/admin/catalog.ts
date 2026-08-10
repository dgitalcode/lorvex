"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  createBrandSchema,
  createCollectionSchema,
  updateBrandSchema,
  updateCollectionSchema,
  type CreateBrandInput,
  type CreateCollectionInput,
  type UpdateBrandInput,
  type UpdateCollectionInput,
} from "@/server/validations/admin/catalog";

export type CatalogActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function actionError(error: unknown): CatalogActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { ok: false, error: "A record with this slug already exists." };
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

export async function createBrand(input: CreateBrandInput): Promise<CatalogActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = createBrandSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: emptyToNull(data.description),
        story: emptyToNull(data.story),
        logoUrl: emptyToNull(data.logoUrl),
        coverUrl: emptyToNull(data.coverUrl),
        country: emptyToNull(data.country),
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        seoTitle: emptyToNull(data.seoTitle),
        seoDescription: emptyToNull(data.seoDescription),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "brand.create",
      entity: "Brand",
      entityId: brand.id,
      metadata: { name: brand.name },
    });

    revalidatePath("/admin/brands");
    revalidatePath("/admin/products");
    return { ok: true, id: brand.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateBrand(input: UpdateBrandInput): Promise<CatalogActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = updateBrandSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const brand = await prisma.brand.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: emptyToNull(data.description),
        story: emptyToNull(data.story),
        logoUrl: emptyToNull(data.logoUrl),
        coverUrl: emptyToNull(data.coverUrl),
        country: emptyToNull(data.country),
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        seoTitle: emptyToNull(data.seoTitle),
        seoDescription: emptyToNull(data.seoDescription),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "brand.update",
      entity: "Brand",
      entityId: brand.id,
      metadata: { name: brand.name },
    });

    revalidatePath("/admin/brands");
    revalidatePath("/admin/products");
    return { ok: true, id: brand.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<CatalogActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = createCollectionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const collection = await prisma.collection.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: emptyToNull(data.description),
        coverUrl: emptyToNull(data.coverUrl),
        videoUrl: emptyToNull(data.videoUrl),
        isLimited: data.isLimited,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        seoTitle: emptyToNull(data.seoTitle),
        seoDescription: emptyToNull(data.seoDescription),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "collection.create",
      entity: "Collection",
      entityId: collection.id,
      metadata: { name: collection.name },
    });

    revalidatePath("/admin/collections");
    revalidatePath("/admin/products");
    return { ok: true, id: collection.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCollection(
  input: UpdateCollectionInput,
): Promise<CatalogActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = updateCollectionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const collection = await prisma.collection.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: emptyToNull(data.description),
        coverUrl: emptyToNull(data.coverUrl),
        videoUrl: emptyToNull(data.videoUrl),
        isLimited: data.isLimited,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        seoTitle: emptyToNull(data.seoTitle),
        seoDescription: emptyToNull(data.seoDescription),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "collection.update",
      entity: "Collection",
      entityId: collection.id,
      metadata: { name: collection.name },
    });

    revalidatePath("/admin/collections");
    revalidatePath("/admin/products");
    return { ok: true, id: collection.id };
  } catch (error) {
    return actionError(error);
  }
}
