import { z } from "zod";

export const registerMediaAssetSchema = z.object({
  publicId: z.string().min(1).max(500),
  url: z.string().url().max(2000),
  type: z.string().min(1).max(50),
  format: z.string().max(20).optional().nullable(),
  width: z.number().int().nonnegative().optional().nullable(),
  height: z.number().int().nonnegative().optional().nullable(),
  bytes: z.number().int().nonnegative().optional().nullable(),
  alt: z.string().max(500).optional().nullable(),
  folder: z.string().max(200).optional().nullable(),
});

export type RegisterMediaAssetInput = z.infer<typeof registerMediaAssetSchema>;

export const deleteMediaAssetSchema = z.object({
  id: z.string().min(1),
});
