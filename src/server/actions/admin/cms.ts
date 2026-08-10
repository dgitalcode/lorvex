"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  type CmsDocumentKey,
  announcementDocumentContentSchema,
  footerDocumentContentSchema,
  homepageDocumentContentSchema,
  navigationDocumentContentSchema,
  parseCmsContent,
  restoreCmsVersionInputSchema,
  saveCmsDraftInputSchema,
  scheduleCmsPublishInputSchema,
} from "@/server/validations/admin/cms";

export type CmsActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

function revalidateStorefront() {
  for (const locale of siteConfig.locales) {
    revalidatePath(`/${locale}`);
  }
}

function revalidateAdminCms(key?: CmsDocumentKey) {
  revalidatePath("/admin/cms");
  revalidatePath("/admin/cms/navigation");
  revalidatePath("/admin/cms/footer");
  revalidatePath("/admin/cms/announcement");
  if (!key || key === "homepage" || key === "announcement") {
    revalidateStorefront();
  }
  if (key === "navigation" || key === "footer") {
    revalidateStorefront();
  }
}

async function nextVersion(documentId: string) {
  const latest = await prisma.cmsDocumentVersion.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}

async function getLatestDraftContent(documentId: string) {
  const version = await prisma.cmsDocumentVersion.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
  });
  if (!version) throw new Error("NO_VERSION");
  return version;
}

async function publishHomepage(content: unknown, userId: string) {
  const parsed = homepageDocumentContentSchema.parse(content);
  const keys = parsed.sections.map((s) => s.key);

  await prisma.$transaction(async (tx) => {
    for (const section of parsed.sections) {
      await tx.homepageSection.upsert({
        where: { key: section.key },
        create: {
          key: section.key,
          type: section.type,
          title: section.title ?? null,
          subtitle: section.subtitle ?? null,
          isVisible: section.isVisible,
          sortOrder: section.sortOrder,
          content: section.content as Prisma.InputJsonValue,
        },
        update: {
          type: section.type,
          title: section.title ?? null,
          subtitle: section.subtitle ?? null,
          isVisible: section.isVisible,
          sortOrder: section.sortOrder,
          content: section.content as Prisma.InputJsonValue,
        },
      });
    }

    await tx.homepageSection.deleteMany({
      where: { key: { notIn: keys } },
    });
  });

  await writeAuditLog({
    userId,
    action: "cms.publish.homepage",
    entity: "HomepageSection",
    metadata: { sectionCount: parsed.sections.length, keys },
  });
}

async function publishNavigation(content: unknown, userId: string) {
  const parsed = navigationDocumentContentSchema.parse(content);

  await prisma.$transaction(async (tx) => {
    const menu = await tx.navigationMenu.upsert({
      where: { key: parsed.menuKey },
      create: { key: parsed.menuKey, label: parsed.menuLabel },
      update: { label: parsed.menuLabel },
    });

    await tx.navigationItem.deleteMany({ where: { menuId: menu.id } });

    const roots = parsed.items
      .filter((item) => !item.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idByClientId = new Map<string, string>();

    for (const item of roots) {
      const created = await tx.navigationItem.create({
        data: {
          menuId: menu.id,
          label: item.label,
          href: item.href ?? null,
          imageUrl: item.imageUrl ?? null,
          sortOrder: item.sortOrder,
          isMega: item.isMega,
          openInNew: item.openInNew,
        },
      });
      idByClientId.set(item.clientId, created.id);
    }

    const children = parsed.items
      .filter((item) => item.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const item of children) {
      const parentDbId = item.parentId
        ? idByClientId.get(item.parentId)
        : undefined;
      if (!parentDbId) continue;

      await tx.navigationItem.create({
        data: {
          menuId: menu.id,
          parentId: parentDbId,
          label: item.label,
          href: item.href ?? null,
          imageUrl: item.imageUrl ?? null,
          sortOrder: item.sortOrder,
          isMega: item.isMega,
          openInNew: item.openInNew,
        },
      });
    }
  });

  await writeAuditLog({
    userId,
    action: "cms.publish.navigation",
    entity: "NavigationMenu",
    entityId: parsed.menuKey,
    metadata: { itemCount: parsed.items.length },
  });
}

async function publishFooter(content: unknown, userId: string) {
  const parsed = footerDocumentContentSchema.parse(content);

  await prisma.$transaction(async (tx) => {
    await tx.footerLink.deleteMany();
    await tx.footerColumn.deleteMany();

    for (const column of parsed.columns.sort((a, b) => a.sortOrder - b.sortOrder)) {
      const createdColumn = await tx.footerColumn.create({
        data: {
          title: column.title,
          sortOrder: column.sortOrder,
        },
      });

      if (column.links.length) {
        await tx.footerLink.createMany({
          data: column.links
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((link, index) => ({
              columnId: createdColumn.id,
              label: link.label,
              href: link.href,
              sortOrder: link.sortOrder ?? index,
            })),
        });
      }
    }
  });

  await writeAuditLog({
    userId,
    action: "cms.publish.footer",
    entity: "FooterColumn",
    metadata: { columnCount: parsed.columns.length },
  });
}

async function publishAnnouncement(content: unknown, userId: string) {
  const parsed = announcementDocumentContentSchema.parse(content);

  const existing = await prisma.announcementBar.findFirst({
    orderBy: { sortOrder: "asc" },
  });

  if (existing) {
    await prisma.announcementBar.update({
      where: { id: existing.id },
      data: {
        message: parsed.message,
        href: parsed.href ?? null,
        isActive: parsed.isActive,
        startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      },
    });
  } else {
    await prisma.announcementBar.create({
      data: {
        message: parsed.message,
        href: parsed.href ?? null,
        isActive: parsed.isActive,
        startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      },
    });
  }

  await writeAuditLog({
    userId,
    action: "cms.publish.announcement",
    entity: "AnnouncementBar",
    metadata: { isActive: parsed.isActive },
  });
}

export async function bootstrapHomepageContent(): Promise<
  ReturnType<typeof homepageDocumentContentSchema.parse>
> {
  const sections = await prisma.homepageSection.findMany({
    orderBy: { sortOrder: "asc" },
  });

  if (!sections.length) {
    return homepageDocumentContentSchema.parse({
      sections: [
        {
          key: "hero",
          type: "hero",
          title: "Hero",
          subtitle: null,
          isVisible: true,
          sortOrder: 1,
          content: {
            title: "Le temps, élevé au rang d'art.",
            subtitle:
              "Une sélection exclusive de montres de prestige, authentifiées et livrées avec le soin d'une maison.",
          },
        },
        {
          key: "stats",
          type: "stats",
          title: "Stats",
          subtitle: null,
          isVisible: true,
          sortOrder: 2,
          content: {
            items: [
              { value: "120+", label: "Références" },
              { value: "15", label: "Maisons" },
            ],
          },
        },
      ],
    });
  }

  return homepageDocumentContentSchema.parse({
    sections: sections.map((section) => ({
      key: section.key,
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      isVisible: section.isVisible,
      sortOrder: section.sortOrder,
      content: section.content as Record<string, unknown>,
    })),
  });
}

export async function bootstrapNavigationContent(): Promise<
  ReturnType<typeof navigationDocumentContentSchema.parse>
> {
  const menu = await prisma.navigationMenu.findUnique({
    where: { key: "header" },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
    },
  });

  if (!menu) {
    return navigationDocumentContentSchema.parse({
      menuKey: "header",
      menuLabel: "Header",
      items: [],
    });
  }

  return navigationDocumentContentSchema.parse({
    menuKey: "header",
    menuLabel: menu.label,
    items: menu.items.map((item) => ({
      clientId: item.id,
      parentId: item.parentId,
      label: item.label,
      href: item.href,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder,
      isMega: item.isMega,
      openInNew: item.openInNew,
    })),
  });
}

export async function bootstrapFooterContent(): Promise<
  ReturnType<typeof footerDocumentContentSchema.parse>
> {
  const columns = await prisma.footerColumn.findMany({
    include: { links: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return footerDocumentContentSchema.parse({
    columns: columns.map((column) => ({
      clientId: column.id,
      title: column.title,
      sortOrder: column.sortOrder,
      links: column.links.map((link) => ({
        label: link.label,
        href: link.href,
        sortOrder: link.sortOrder,
      })),
    })),
  });
}

export async function bootstrapAnnouncementContent(): Promise<
  ReturnType<typeof announcementDocumentContentSchema.parse>
> {
  const bar =
    (await prisma.announcementBar.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })) ??
    (await prisma.announcementBar.findFirst({
      orderBy: { sortOrder: "asc" },
    }));

  if (!bar) {
    return announcementDocumentContentSchema.parse({
      message:
        "Livraison assurée partout au Maroc · Conciergerie privée sur rendez-vous",
      href: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
    });
  }

  return announcementDocumentContentSchema.parse({
    message: bar.message,
    href: bar.href,
    isActive: bar.isActive,
    startsAt: bar.startsAt?.toISOString() ?? null,
    endsAt: bar.endsAt?.toISOString() ?? null,
  });
}

export async function ensureCmsDocument(
  key: CmsDocumentKey,
  type: string,
  title: string,
  bootstrap: () => Promise<unknown>,
) {
  await assertPermission("cms.view");

  const existing = await prisma.cmsDocument.findUnique({
    where: { key },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 25,
        include: {
          author: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (existing) return existing;

  const content = await bootstrap();
  const user = await assertPermission("cms.view");

  return prisma.cmsDocument.create({
    data: {
      key,
      type,
      title,
      status: "DRAFT",
      versions: {
        create: {
          version: 1,
          content: content as Prisma.InputJsonValue,
          note: "Imported from live content",
          createdBy: user.id,
        },
      },
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 25,
        include: {
          author: { select: { name: true, email: true } },
        },
      },
    },
  });
}

export async function saveCmsDraft(input: {
  key: CmsDocumentKey;
  type: string;
  title: string;
  content: unknown;
}): Promise<CmsActionResult> {
  try {
    const user = await assertPermission("cms.view");
    const parsed = saveCmsDraftInputSchema.parse(input);
    parseCmsContent(parsed.key, parsed.content);

    const document = await prisma.cmsDocument.upsert({
      where: { key: parsed.key },
      create: {
        key: parsed.key,
        type: parsed.type,
        title: parsed.title,
        status: "DRAFT",
      },
      update: {
        type: parsed.type,
        title: parsed.title,
        status: "DRAFT",
      },
    });

    const versionNumber = await nextVersion(document.id);

    await prisma.cmsDocumentVersion.create({
      data: {
        documentId: document.id,
        version: versionNumber,
        content: parsed.content as Prisma.InputJsonValue,
        createdBy: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "cms.draft.save",
      entity: "CmsDocument",
      entityId: document.id,
      metadata: { key: parsed.key, version: versionNumber },
    });

    revalidateAdminCms(parsed.key);
    return { ok: true, data: { documentId: document.id, version: versionNumber } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "SAVE_FAILED",
    };
  }
}

export async function publishCmsDocument(
  key: CmsDocumentKey,
): Promise<CmsActionResult> {
  try {
    const user = await assertPermission("cms.publish");

    const document = await prisma.cmsDocument.findUnique({ where: { key } });
    if (!document) return { ok: false, error: "DOCUMENT_NOT_FOUND" };

    const latest = await getLatestDraftContent(document.id);

    switch (key) {
      case "homepage":
        await publishHomepage(latest.content, user.id);
        break;
      case "navigation":
        await publishNavigation(latest.content, user.id);
        break;
      case "footer":
        await publishFooter(latest.content, user.id);
        break;
      case "announcement":
        await publishAnnouncement(latest.content, user.id);
        break;
    }

    await prisma.cmsDocument.update({
      where: { id: document.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        scheduledAt: null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "cms.publish",
      entity: "CmsDocument",
      entityId: document.id,
      metadata: { key, version: latest.version },
    });

    revalidateAdminCms(key);
    return { ok: true, data: { version: latest.version } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "PUBLISH_FAILED",
    };
  }
}

export async function restoreCmsVersion(
  documentId: string,
  version: number,
): Promise<CmsActionResult> {
  try {
    const user = await assertPermission("cms.view");
    restoreCmsVersionInputSchema.parse({ documentId, version });

    const target = await prisma.cmsDocumentVersion.findUnique({
      where: { documentId_version: { documentId, version } },
    });
    if (!target) return { ok: false, error: "VERSION_NOT_FOUND" };

    const document = await prisma.cmsDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) return { ok: false, error: "DOCUMENT_NOT_FOUND" };

    parseCmsContent(document.key as CmsDocumentKey, target.content);

    const versionNumber = await nextVersion(documentId);

    await prisma.cmsDocumentVersion.create({
      data: {
        documentId,
        version: versionNumber,
        content: target.content as Prisma.InputJsonValue,
        note: `Restored from v${version}`,
        createdBy: user.id,
      },
    });

    await prisma.cmsDocument.update({
      where: { id: documentId },
      data: { status: "DRAFT" },
    });

    await writeAuditLog({
      userId: user.id,
      action: "cms.version.restore",
      entity: "CmsDocument",
      entityId: documentId,
      metadata: { restoredFrom: version, newVersion: versionNumber },
    });

    revalidateAdminCms(document.key as CmsDocumentKey);
    return { ok: true, data: { version: versionNumber } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "RESTORE_FAILED",
    };
  }
}

export async function scheduleCmsPublish(
  key: CmsDocumentKey,
  scheduledAt: string,
): Promise<CmsActionResult> {
  try {
    const user = await assertPermission("cms.publish");
    const parsed = scheduleCmsPublishInputSchema.parse({ key, scheduledAt });

    const document = await prisma.cmsDocument.upsert({
      where: { key: parsed.key },
      create: {
        key: parsed.key,
        type: parsed.key,
        title: parsed.key,
        status: "SCHEDULED",
        scheduledAt: new Date(parsed.scheduledAt),
      },
      update: {
        status: "SCHEDULED",
        scheduledAt: new Date(parsed.scheduledAt),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "cms.publish.schedule",
      entity: "CmsDocument",
      entityId: document.id,
      metadata: { key: parsed.key, scheduledAt: parsed.scheduledAt },
    });

    revalidateAdminCms(parsed.key);
    return { ok: true, data: { scheduledAt: parsed.scheduledAt } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "SCHEDULE_FAILED",
    };
  }
}

export async function reorderHomepageSections(
  keys: string[],
): Promise<CmsActionResult> {
  try {
    const user = await assertPermission("cms.view");

    await prisma.$transaction(
      keys.map((key, index) =>
        prisma.homepageSection.updateMany({
          where: { key },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    const document = await prisma.cmsDocument.findUnique({
      where: { key: "homepage" },
    });

    if (document) {
      const latest = await getLatestDraftContent(document.id);
      const content = homepageDocumentContentSchema.parse(latest.content);
      const orderMap = new Map(keys.map((key, index) => [key, index + 1]));

      const nextContent = {
        sections: content.sections
          .map((section) => ({
            ...section,
            sortOrder: orderMap.get(section.key) ?? section.sortOrder,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };

      const versionNumber = await nextVersion(document.id);
      await prisma.cmsDocumentVersion.create({
        data: {
          documentId: document.id,
          version: versionNumber,
          content: nextContent as Prisma.InputJsonValue,
          note: "Reordered sections",
          createdBy: user.id,
        },
      });
    }

    await writeAuditLog({
      userId: user.id,
      action: "cms.homepage.reorder",
      entity: "HomepageSection",
      metadata: { keys },
    });

    revalidateAdminCms("homepage");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "REORDER_FAILED",
    };
  }
}

export async function getLiveHomepageSections() {
  await assertPermission("cms.view");
  return prisma.homepageSection.findMany({
    orderBy: { sortOrder: "asc" },
  });
}
