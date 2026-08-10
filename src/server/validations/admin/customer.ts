import { z } from "zod";

export const updateCustomerStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});

export const createCustomerTagSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const customerTagActionSchema = z.object({
  userId: z.string().min(1),
  tagId: z.string().min(1),
});
