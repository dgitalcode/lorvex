"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  adjustInventorySchema,
  bulkDeleteProductsSchema,
  bulkProductStatusSchema,
  createProductSchema,
  duplicateProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/server/validations/admin/product";

export type ProductActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function actionError(error: unknown): ProductActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { ok: false, error: "A record with this slug or SKU already exists." };
    }
    if (error.code === "P2025") {
      return { ok: false, error: "Record not found." };
    }
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return { ok: false, error: "Unauthorized." };
    if (error.message === "FORBIDDEN") return { ok: false, error: "Forbidden." };
    if (error.message === "VARIANT_IN_USE") {
      return { ok: false, error: "Cannot remove a variant linked to orders or carts." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong." };
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function variantCreateData(
  variants: CreateProductInput["variants"],
): Prisma.ProductVariantCreateWithoutProductInput[] {
  return variants.map((variant, index) => ({
    name: variant.name,
    sku: variant.sku,
    barcode: emptyToNull(variant.barcode),
    color: emptyToNull(variant.color),
    dialColor: emptyToNull(variant.dialColor),
    strapMaterial: emptyToNull(variant.strapMaterial),
    caseMaterial: emptyToNull(variant.caseMaterial),
    caseSizeMm: variant.caseSizeMm ?? null,
    waterResistanceM: variant.waterResistanceM ?? null,
    price: variant.price ?? null,
    compareAtPrice: variant.compareAtPrice ?? null,
    stock: variant.stock,
    lowStockAt: variant.lowStockAt,
    imageUrl: emptyToNull(variant.imageUrl),
    isDefault: variant.isDefault,
    sortOrder: variant.sortOrder ?? index,
  }));
}

function productScalarData(data: CreateProductInput | UpdateProductInput) {
  const publishedAt =
    data.status === "ACTIVE"
      ? new Date()
      : data.status === "DRAFT" || data.status === "ARCHIVED"
        ? null
        : undefined;

  return {
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    barcode: emptyToNull(data.barcode),
    shortDescription: emptyToNull(data.shortDescription),
    description: data.description,
    brandId: data.brandId,
    collectionId: emptyToNull(data.collectionId) ?? null,
    categoryId: emptyToNull(data.categoryId) ?? null,
    gender: data.gender,
    movement: data.movement,
    status: data.status,
    basePrice: data.basePrice,
    compareAtPrice: data.compareAtPrice ?? null,
    currency: data.currency,
    warrantyMonths: data.warrantyMonths,
    isFeatured: data.isFeatured,
    isNewArrival: data.isNewArrival,
    isBestSeller: data.isBestSeller,
    isLimitedEdition: data.isLimitedEdition,
    metaTitle: emptyToNull(data.metaTitle),
    metaDescription: emptyToNull(data.metaDescription),
    ogImage: emptyToNull(data.ogImage),
    ...(publishedAt !== undefined ? { publishedAt } : {}),
  };
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ProductActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    const product = await prisma.product.create({
      data: {
        ...productScalarData(data),
        variants: { create: variantCreateData(data.variants) },
        media: {
          create: data.media.map((item, index) => ({
            url: item.url,
            type: item.type,
            alt: emptyToNull(item.alt),
            publicId: emptyToNull(item.publicId),
            isPrimary: item.isPrimary,
            sortOrder: item.sortOrder ?? index,
          })),
        },
        specifications: {
          create: data.specifications.map((spec, index) => ({
            group: spec.group,
            label: spec.label,
            value: spec.value,
            sortOrder: spec.sortOrder ?? index,
          })),
        },
        relatedFrom: {
          create: data.relations.map((relation, index) => ({
            relatedId: relation.relatedId,
            type: relation.type,
            sortOrder: relation.sortOrder ?? index,
          })),
        },
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      metadata: { name: product.name, sku: product.sku },
    });

    revalidatePath("/admin/products");
    return { ok: true, id: product.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProduct(
  input: UpdateProductInput,
): Promise<ProductActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id: data.id },
        include: { variants: true },
      });
      if (!existing) throw new Error("Product not found.");

      await tx.product.update({
        where: { id: data.id },
        data: productScalarData(data),
      });

      const submittedVariantIds = data.variants
        .map((variant) => variant.id)
        .filter(Boolean) as string[];
      const removedVariantIds = existing.variants
        .map((variant) => variant.id)
        .filter((id) => !submittedVariantIds.includes(id));

      for (const variantId of removedVariantIds) {
        const usage = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: {
            _count: { select: { cartItems: true, orderItems: true } },
          },
        });
        if ((usage?._count.cartItems ?? 0) + (usage?._count.orderItems ?? 0) > 0) {
          throw new Error("VARIANT_IN_USE");
        }
        await tx.productVariant.delete({ where: { id: variantId } });
      }

      for (const [index, variant] of data.variants.entries()) {
        const payload = {
          name: variant.name,
          sku: variant.sku,
          barcode: emptyToNull(variant.barcode),
          color: emptyToNull(variant.color),
          dialColor: emptyToNull(variant.dialColor),
          strapMaterial: emptyToNull(variant.strapMaterial),
          caseMaterial: emptyToNull(variant.caseMaterial),
          caseSizeMm: variant.caseSizeMm ?? null,
          waterResistanceM: variant.waterResistanceM ?? null,
          price: variant.price ?? null,
          compareAtPrice: variant.compareAtPrice ?? null,
          stock: variant.stock,
          lowStockAt: variant.lowStockAt,
          imageUrl: emptyToNull(variant.imageUrl),
          isDefault: variant.isDefault,
          sortOrder: variant.sortOrder ?? index,
        };

        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: payload,
          });
        } else {
          await tx.productVariant.create({
            data: { ...payload, productId: data.id },
          });
        }
      }

      await tx.productMedia.deleteMany({ where: { productId: data.id } });
      if (data.media.length) {
        await tx.productMedia.createMany({
          data: data.media.map((item, index) => ({
            productId: data.id,
            url: item.url,
            type: item.type,
            alt: emptyToNull(item.alt),
            publicId: emptyToNull(item.publicId),
            isPrimary: item.isPrimary,
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }

      await tx.productSpecification.deleteMany({ where: { productId: data.id } });
      if (data.specifications.length) {
        await tx.productSpecification.createMany({
          data: data.specifications.map((spec, index) => ({
            productId: data.id,
            group: spec.group,
            label: spec.label,
            value: spec.value,
            sortOrder: spec.sortOrder ?? index,
          })),
        });
      }

      await tx.productRelation.deleteMany({ where: { productId: data.id } });
      if (data.relations.length) {
        await tx.productRelation.createMany({
          data: data.relations.map((relation, index) => ({
            productId: data.id,
            relatedId: relation.relatedId,
            type: relation.type,
            sortOrder: relation.sortOrder ?? index,
          })),
        });
      }
    });

    await writeAuditLog({
      userId: user.id,
      action: "product.update",
      entity: "Product",
      entityId: data.id,
      metadata: { name: data.name, sku: data.sku },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.id}`);
    return { ok: true, id: data.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteProducts(ids: string[]): Promise<ProductActionResult> {
  try {
    const user = await assertPermission("products.delete");
    const parsed = bulkDeleteProductsSchema.safeParse({ ids });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const products = await prisma.product.findMany({
      where: { id: { in: parsed.data.ids } },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
    });

    const blocked = products.filter((product) => product._count.orderItems > 0);
    if (blocked.length) {
      return {
        ok: false,
        error: `Cannot delete products with orders: ${blocked.map((p) => p.name).join(", ")}`,
      };
    }

    await prisma.product.deleteMany({ where: { id: { in: parsed.data.ids } } });

    await writeAuditLog({
      userId: user.id,
      action: "product.delete",
      entity: "Product",
      metadata: { ids: parsed.data.ids, count: parsed.data.ids.length },
    });

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function duplicateProduct(input: {
  id: string;
  slug?: string;
  sku?: string;
}): Promise<ProductActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = duplicateProductSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const source = await prisma.product.findUnique({
      where: { id: parsed.data.id },
      include: {
        variants: true,
        media: true,
        specifications: true,
        relatedFrom: true,
      },
    });
    if (!source) return { ok: false, error: "Product not found." };

    const newSlug = parsed.data.slug ?? `${source.slug}-copy`;
    const newSku = parsed.data.sku ?? `${source.sku}-COPY`;

    const duplicate = await prisma.product.create({
      data: {
        name: `${source.name} (Copy)`,
        slug: newSlug,
        sku: newSku,
        barcode: source.barcode ? `${source.barcode}-C` : null,
        shortDescription: source.shortDescription,
        description: source.description,
        brandId: source.brandId,
        collectionId: source.collectionId,
        categoryId: source.categoryId,
        gender: source.gender,
        movement: source.movement,
        status: "DRAFT",
        basePrice: source.basePrice,
        compareAtPrice: source.compareAtPrice,
        currency: source.currency,
        warrantyMonths: source.warrantyMonths,
        isFeatured: false,
        isNewArrival: source.isNewArrival,
        isBestSeller: false,
        isLimitedEdition: source.isLimitedEdition,
        metaTitle: source.metaTitle,
        metaDescription: source.metaDescription,
        ogImage: source.ogImage,
        variants: {
          create: source.variants.map((variant, index) => ({
            sku: `${variant.sku}-C${index + 1}`,
            barcode: variant.barcode ? `${variant.barcode}-C` : null,
            name: variant.name,
            color: variant.color,
            dialColor: variant.dialColor,
            strapMaterial: variant.strapMaterial,
            caseMaterial: variant.caseMaterial,
            caseSizeMm: variant.caseSizeMm,
            waterResistanceM: variant.waterResistanceM,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stock: 0,
            lowStockAt: variant.lowStockAt,
            isDefault: variant.isDefault,
            imageUrl: variant.imageUrl,
            sortOrder: variant.sortOrder,
          })),
        },
        media: {
          create: source.media.map((item) => ({
            type: item.type,
            url: item.url,
            publicId: item.publicId,
            alt: item.alt,
            sortOrder: item.sortOrder,
            isPrimary: item.isPrimary,
            width: item.width,
            height: item.height,
          })),
        },
        specifications: {
          create: source.specifications.map((spec) => ({
            group: spec.group,
            label: spec.label,
            value: spec.value,
            sortOrder: spec.sortOrder,
          })),
        },
        relatedFrom: {
          create: source.relatedFrom.map((relation) => ({
            relatedId: relation.relatedId,
            type: relation.type,
            sortOrder: relation.sortOrder,
          })),
        },
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "product.duplicate",
      entity: "Product",
      entityId: duplicate.id,
      metadata: { sourceId: source.id, name: duplicate.name },
    });

    revalidatePath("/admin/products");
    return { ok: true, id: duplicate.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProductStatus(input: {
  ids: string[];
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}): Promise<ProductActionResult> {
  try {
    const user = await assertPermission("products.edit");
    const parsed = bulkProductStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    await prisma.product.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: {
        status: parsed.data.status,
        publishedAt: parsed.data.status === "ACTIVE" ? new Date() : null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "product.status",
      entity: "Product",
      metadata: { ids: parsed.data.ids, status: parsed.data.status },
    });

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adjustInventory(input: {
  variantId: string;
  delta: number;
  reason: string;
  reference?: string | null;
  note?: string | null;
}): Promise<ProductActionResult> {
  try {
    const user = await assertPermission("inventory.manage");
    const parsed = adjustInventorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: data.variantId },
        include: { product: { select: { id: true, name: true } } },
      });
      if (!variant) throw new Error("Variant not found.");

      const nextStock = variant.stock + data.delta;
      if (nextStock < 0) throw new Error("Insufficient stock for this adjustment.");

      await tx.productVariant.update({
        where: { id: data.variantId },
        data: { stock: nextStock },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId: data.variantId,
          delta: data.delta,
          reason: data.reason,
          reference: emptyToNull(data.reference),
          note: emptyToNull(data.note),
          createdBy: user.id,
        },
      });

      const totalStock = await tx.productVariant.aggregate({
        where: { productId: variant.productId },
        _sum: { stock: true },
      });
      const sum = totalStock._sum.stock ?? 0;
      if (sum === 0 && variant.product) {
        await tx.product.update({
          where: { id: variant.productId },
          data: { status: "OUT_OF_STOCK" },
        });
      } else if (sum > 0) {
        const product = await tx.product.findUnique({
          where: { id: variant.productId },
          select: { status: true },
        });
        if (product?.status === "OUT_OF_STOCK") {
          await tx.product.update({
            where: { id: variant.productId },
            data: { status: "ACTIVE" },
          });
        }
      }
    });

    await writeAuditLog({
      userId: user.id,
      action: "inventory.adjust",
      entity: "ProductVariant",
      entityId: data.variantId,
      metadata: { delta: data.delta, reason: data.reason },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function suggestDuplicateSlug(name: string) {
  const base = slugify(name || "product");
  let candidate = `${base}-copy`;
  let counter = 2;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-copy-${counter}`;
    counter += 1;
  }
  return candidate;
}
