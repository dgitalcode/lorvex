import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

export const createBrandSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  description: z.string().max(5000).optional().nullable(),
  story: z.string().max(10000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  coverUrl: z.string().url().optional().nullable().or(z.literal("")),
  country: z.string().max(80).optional().nullable(),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

export const updateBrandSchema = createBrandSchema.extend({
  id: z.string().cuid(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  description: z.string().max(5000).optional().nullable(),
  coverUrl: z.string().url().optional().nullable().or(z.literal("")),
  videoUrl: z.string().url().optional().nullable().or(z.literal("")),
  isLimited: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

export const updateCollectionSchema = createCollectionSchema.extend({
  id: z.string().cuid(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
