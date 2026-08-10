import { z } from "zod";

export const updateSiteSettingsSchema = z.object({
  siteName: z.string().min(1).max(120),
  tagline: z.string().max(300).optional().nullable(),
  logoUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  logoDarkUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  faviconUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  supportEmail: z.string().email().max(200).optional().nullable().or(z.literal("")),
  supportPhone: z.string().max(40).optional().nullable(),
  whatsappNumber: z.string().max(40).optional().nullable(),
  socialInstagram: z.string().max(200).optional().nullable(),
  socialFacebook: z.string().max(200).optional().nullable(),
  socialTikTok: z.string().max(200).optional().nullable(),
  socialYoutube: z.string().max(200).optional().nullable(),
  defaultLocale: z.enum(["fr", "en", "ar"]),
  defaultCurrency: z.string().min(3).max(3),
  enableGuestCheckout: z.boolean(),
  enableReviews: z.boolean(),
  maintenanceMode: z.boolean(),
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;

export const updateStaffRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "EDITOR", "SUPPORT", "ANALYST"]),
});

export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
