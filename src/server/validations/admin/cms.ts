import { z } from "zod";

export const CMS_DOCUMENT_KEYS = [
  "homepage",
  "navigation",
  "footer",
  "announcement",
] as const;

export type CmsDocumentKey = (typeof CMS_DOCUMENT_KEYS)[number];

export const heroSectionContentSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  /** Preferred media mode for the storefront Hero. */
  mediaType: z.enum(["image", "video", "none"]).optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  /** Poster / fallback image shown while video loads or when autoplay fails. */
  posterUrl: z.string().optional(),
  imagePublicId: z.string().optional(),
  videoPublicId: z.string().optional(),
  posterPublicId: z.string().optional(),
  ctaPrimaryHref: z.string().optional(),
  ctaSecondaryHref: z.string().optional(),
});

export type HeroSectionContent = z.infer<typeof heroSectionContentSchema>;

export const statsSectionContentSchema = z.object({
  items: z.array(
    z.object({
      value: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
});

export const homepageSectionSchema = z.object({
  key: z.string().min(1).max(64),
  type: z.string().min(1).max(64),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  isVisible: z.boolean(),
  sortOrder: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()),
});

export const homepageDocumentContentSchema = z.object({
  sections: z.array(homepageSectionSchema).min(1),
});

export const navigationItemSchema = z.object({
  clientId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  label: z.string().min(1).max(120),
  href: z.string().max(512).nullable().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  sortOrder: z.number().int().min(0),
  isMega: z.boolean().default(false),
  openInNew: z.boolean().default(false),
});

export const navigationDocumentContentSchema = z.object({
  menuKey: z.literal("header").default("header"),
  menuLabel: z.string().min(1).default("Header"),
  items: z.array(navigationItemSchema),
});

export const footerLinkSchema = z.object({
  label: z.string().min(1).max(120),
  href: z.string().min(1).max(512),
  sortOrder: z.number().int().min(0),
});

export const footerColumnSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0),
  links: z.array(footerLinkSchema),
});

export const footerDocumentContentSchema = z.object({
  columns: z.array(footerColumnSchema),
});

export const announcementDocumentContentSchema = z.object({
  message: z.string().min(1).max(500),
  href: z.string().max(512).nullable().optional(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export const saveCmsDraftInputSchema = z.object({
  key: z.enum(CMS_DOCUMENT_KEYS),
  type: z.string().min(1),
  title: z.string().min(1),
  content: z.unknown(),
});

export const scheduleCmsPublishInputSchema = z.object({
  key: z.enum(CMS_DOCUMENT_KEYS),
  scheduledAt: z.string().datetime(),
});

export const restoreCmsVersionInputSchema = z.object({
  documentId: z.string().min(1),
  version: z.number().int().positive(),
});

export const reorderHomepageSectionsInputSchema = z.object({
  keys: z.array(z.string().min(1)).min(1),
});

export type HomepageDocumentContent = z.infer<typeof homepageDocumentContentSchema>;
export type HomepageSectionInput = z.infer<typeof homepageSectionSchema>;
export type NavigationDocumentContent = z.infer<typeof navigationDocumentContentSchema>;
export type NavigationItemInput = z.infer<typeof navigationItemSchema>;
export type FooterDocumentContent = z.infer<typeof footerDocumentContentSchema>;
export type FooterColumnInput = z.infer<typeof footerColumnSchema>;
export type AnnouncementDocumentContent = z.infer<
  typeof announcementDocumentContentSchema
>;

export function parseCmsContent(key: CmsDocumentKey, content: unknown) {
  switch (key) {
    case "homepage":
      return homepageDocumentContentSchema.parse(content);
    case "navigation":
      return navigationDocumentContentSchema.parse(content);
    case "footer":
      return footerDocumentContentSchema.parse(content);
    case "announcement":
      return announcementDocumentContentSchema.parse(content);
  }
}
