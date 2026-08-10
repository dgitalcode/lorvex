import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const skuSchema = z.string().min(2).max(64);

export const productVariantSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(120),
  sku: skuSchema,
  barcode: z.string().max(64).optional().nullable(),
  color: z.string().max(80).optional().nullable(),
  dialColor: z.string().max(80).optional().nullable(),
  strapMaterial: z.string().max(80).optional().nullable(),
  caseMaterial: z.string().max(80).optional().nullable(),
  caseSizeMm: z.coerce.number().positive().max(999).optional().nullable(),
  waterResistanceM: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockAt: z.coerce.number().int().min(0).default(3),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const productMediaSchema = z.object({
  id: z.string().cuid().optional(),
  url: z.string().url(),
  type: z.enum(["IMAGE", "VIDEO", "SPIN_360"]).default("IMAGE"),
  alt: z.string().max(200).optional().nullable(),
  publicId: z.string().max(200).optional().nullable(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const productSpecSchema = z.object({
  id: z.string().cuid().optional(),
  group: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(500),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const productRelationSchema = z.object({
  relatedId: z.string().cuid(),
  type: z
    .enum(["RELATED", "FREQUENTLY_BOUGHT", "ALTERNATIVE", "UPSELL"])
    .default("RELATED"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const productCoreSchema = z.object({
  name: z.string().min(2).max(160),
  slug: slugSchema,
  sku: skuSchema,
  barcode: z.string().max(64).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().min(10).max(20000),
  brandId: z.string().cuid(),
  collectionId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX"]).default("UNISEX"),
  movement: z.enum(["AUTOMATIC", "MANUAL", "QUARTZ", "SPRING_DRIVE", "SMART"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).default("DRAFT"),
  basePrice: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default("MAD"),
  warrantyMonths: z.coerce.number().int().min(0).max(120).default(24),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isLimitedEdition: z.boolean().default(false),
  metaTitle: z.string().max(160).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().url().optional().nullable().or(z.literal("")),
  variants: z.array(productVariantSchema).min(1, "At least one variant is required"),
  media: z.array(productMediaSchema).default([]),
  specifications: z.array(productSpecSchema).default([]),
  relations: z.array(productRelationSchema).default([]),
});

export const createProductSchema = productCoreSchema.superRefine((data, ctx) => {
  const defaultCount = data.variants.filter((v) => v.isDefault).length;
  if (defaultCount !== 1) {
    ctx.addIssue({
      code: "custom",
      message: "Exactly one variant must be marked as default",
      path: ["variants"],
    });
  }
  const skus = data.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) {
    ctx.addIssue({
      code: "custom",
      message: "Variant SKUs must be unique",
      path: ["variants"],
    });
  }
});

export const updateProductSchema = productCoreSchema
  .extend({ id: z.string().cuid() })
  .superRefine((data, ctx) => {
    const defaultCount = data.variants.filter((v) => v.isDefault).length;
    if (defaultCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one variant must be marked as default",
        path: ["variants"],
      });
    }
    const skus = data.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({
        code: "custom",
        message: "Variant SKUs must be unique",
        path: ["variants"],
      });
    }
  });

export const bulkDeleteProductsSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export const bulkProductStatusSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

export const duplicateProductSchema = z.object({
  id: z.string().cuid(),
  slug: slugSchema.optional(),
  sku: skuSchema.optional(),
});

export const adjustInventorySchema = z.object({
  variantId: z.string().cuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Delta must not be zero"),
  reason: z.string().min(2).max(120),
  reference: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFormInput = CreateProductInput;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
