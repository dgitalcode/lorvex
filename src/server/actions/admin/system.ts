"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Role } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCloudinaryConfigStatus,
  getCloudinaryUsage,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { getEmailConfigStatus } from "@/lib/email";
import { assertPermission } from "@/server/auth/require-admin";
import {
  PERMISSIONS,
  permissionsForRole,
  type PermissionKey,
} from "@/server/auth/permissions";
import { writeAuditLog, writeSystemLog } from "@/server/services/audit";
import { SITE_SETTINGS_TAG } from "@/server/repositories/settings";
import {
  updateSiteSettingsSchema,
  updateStaffRoleSchema,
  type UpdateSiteSettingsInput,
  type UpdateStaffRoleInput,
} from "@/server/validations/admin/system";

export type SystemActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

function actionError(error: unknown): SystemActionResult {
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

function permissionCategory(key: PermissionKey) {
  const prefix = key.split(".")[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

async function seedPermissionsInternal() {
  const permissionRows = await Promise.all(
    (Object.keys(PERMISSIONS) as PermissionKey[]).map(async (key) => {
      return prisma.permission.upsert({
        where: { key },
        create: {
          key,
          name: PERMISSIONS[key],
          category: permissionCategory(key),
        },
        update: {
          name: PERMISSIONS[key],
          category: permissionCategory(key),
        },
      });
    }),
  );

  const staffRoles: Role[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR",
    "SUPPORT",
    "ANALYST",
  ];

  for (const role of staffRoles) {
    const allowed = permissionsForRole(role);
    for (const permission of permissionRows) {
      if (!allowed.includes(permission.key as PermissionKey)) continue;
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id,
          },
        },
        create: { role, permissionId: permission.id },
        update: {},
      });
    }
  }

  await writeSystemLog({
    level: "info",
    source: "system.seedPermissions",
    message: "Permission matrix seeded",
    meta: { count: permissionRows.length },
  });

  revalidatePath("/admin/system/roles");
  return permissionRows.length;
}

export async function ensurePermissionsSeeded() {
  const count = await prisma.permission.count();
  if (count > 0) return;
  await seedPermissionsInternal();
}

export async function seedPermissions(): Promise<SystemActionResult> {
  try {
    await assertPermission("system.manage");
    const count = await seedPermissionsInternal();
    return { ok: true, data: { count } };
  } catch (error) {
    return actionError(error);
  }
}

export async function runHealthChecks(): Promise<SystemActionResult> {
  try {
    const user = await assertPermission("system.manage");
    const checks: Array<{
      service: string;
      status: string;
      latencyMs?: number;
      detail?: string;
    }> = [];

    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({
        service: "database",
        status: "healthy",
        latencyMs: Date.now() - dbStart,
      });
    } catch (error) {
      checks.push({
        service: "database",
        status: "unhealthy",
        latencyMs: Date.now() - dbStart,
        detail: error instanceof Error ? error.message : "Database unreachable",
      });
    }

    const cloudinaryStatus = getCloudinaryConfigStatus();
    checks.push({
      service: "cloudinary",
      status: cloudinaryStatus.configured ? "configured" : "missing_config",
      detail: cloudinaryStatus.missing.length
        ? `Missing: ${cloudinaryStatus.missing.join(", ")}`
        : cloudinaryStatus.cloudName ?? undefined,
    });

    const emailStatus = getEmailConfigStatus();
    checks.push({
      service: "email",
      status: emailStatus.configured ? "configured" : "missing_config",
      detail: emailStatus.missing.length
        ? `Missing: ${emailStatus.missing.join(", ")}`
        : emailStatus.from,
    });

    await Promise.all(
      checks.map((check) =>
        prisma.systemHealthCheck.create({
          data: {
            service: check.service,
            status: check.status,
            latencyMs: check.latencyMs ?? null,
            detail: check.detail ?? null,
          },
        }),
      ),
    );

    await writeAuditLog({
      userId: user.id,
      action: "system.health.run",
      entity: "SystemHealthCheck",
      metadata: { checks },
    });

    await writeSystemLog({
      level: "info",
      source: "system.health",
      message: "Health checks completed",
      meta: { checks },
    });

    revalidatePath("/admin/system");
    return { ok: true, data: { checks } };
  } catch (error) {
    return actionError(error);
  }
}

export async function createBackupRecord(): Promise<SystemActionResult> {
  try {
    const user = await assertPermission("system.manage");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `lorvex-backup-${timestamp}.json`;
    const backupsDir = path.join(process.cwd(), "backups");
    const filePath = path.join(backupsDir, filename);

    const record = await prisma.backupRecord.create({
      data: {
        filename,
        path: filePath,
        status: "PENDING",
        createdBy: user.id,
      },
    });

    const [
      users,
      products,
      orders,
      customers,
      mediaAssets,
      analyticsEvents,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.mediaAsset.count(),
      prisma.analyticsEvent.count(),
      prisma.auditLog.count(),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      counts: {
        users,
        products,
        orders,
        customers,
        mediaAssets,
        analyticsEvents,
        auditLogs,
      },
      integrations: {
        cloudinary: getCloudinaryConfigStatus().configured,
        email: getEmailConfigStatus().configured,
      },
    };

    await mkdir(backupsDir, { recursive: true });
    const serialized = JSON.stringify(payload, null, 2);
    await writeFile(filePath, serialized, "utf8");

    const completed = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "COMPLETED",
        sizeBytes: Buffer.byteLength(serialized, "utf8"),
        completedAt: new Date(),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "system.backup.create",
      entity: "BackupRecord",
      entityId: completed.id,
      metadata: { filename, counts: payload.counts },
    });

    await writeSystemLog({
      level: "info",
      source: "system.backup",
      message: "Backup record completed",
      meta: { filename, sizeBytes: completed.sizeBytes },
    });

    revalidatePath("/admin/system");
    return { ok: true, data: { id: completed.id, filename } };
  } catch (error) {
    return actionError(error);
  }
}

const CACHE_PATHS = [
  "/",
  "/fr",
  "/en",
  "/ar",
  "/fr/shop",
  "/en/shop",
  "/ar/shop",
  "/admin",
  "/admin/products",
  "/admin/orders",
  "/admin/customers",
  "/admin/cms",
];

export async function clearCacheTags(): Promise<SystemActionResult> {
  try {
    const user = await assertPermission("system.manage");

    for (const route of CACHE_PATHS) {
      revalidatePath(route);
    }

    await writeAuditLog({
      userId: user.id,
      action: "system.cache.clear",
      entity: "Cache",
      metadata: { paths: CACHE_PATHS },
    });

    await writeSystemLog({
      level: "info",
      source: "system.cache",
      message: "Cache paths revalidated",
      meta: { paths: CACHE_PATHS },
    });

    return { ok: true, data: { paths: CACHE_PATHS.length } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateSiteSettings(
  input: UpdateSiteSettingsInput,
): Promise<SystemActionResult> {
  try {
    const user = await assertPermission("system.manage");
    const data = updateSiteSettingsSchema.parse(input);

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        siteName: data.siteName,
        tagline: emptyToNull(data.tagline),
        logoUrl: emptyToNull(data.logoUrl),
        logoDarkUrl: emptyToNull(data.logoDarkUrl),
        faviconUrl: emptyToNull(data.faviconUrl),
        supportEmail: emptyToNull(data.supportEmail),
        supportPhone: emptyToNull(data.supportPhone),
        whatsappNumber: emptyToNull(data.whatsappNumber),
        socialInstagram: emptyToNull(data.socialInstagram),
        socialFacebook: emptyToNull(data.socialFacebook),
        socialTikTok: emptyToNull(data.socialTikTok),
        socialYoutube: emptyToNull(data.socialYoutube),
        defaultLocale: data.defaultLocale,
        defaultCurrency: data.defaultCurrency,
        enableGuestCheckout: data.enableGuestCheckout,
        enableReviews: data.enableReviews,
        maintenanceMode: data.maintenanceMode,
      },
      update: {
        siteName: data.siteName,
        tagline: emptyToNull(data.tagline),
        logoUrl: emptyToNull(data.logoUrl),
        logoDarkUrl: emptyToNull(data.logoDarkUrl),
        faviconUrl: emptyToNull(data.faviconUrl),
        supportEmail: emptyToNull(data.supportEmail),
        supportPhone: emptyToNull(data.supportPhone),
        whatsappNumber: emptyToNull(data.whatsappNumber),
        socialInstagram: emptyToNull(data.socialInstagram),
        socialFacebook: emptyToNull(data.socialFacebook),
        socialTikTok: emptyToNull(data.socialTikTok),
        socialYoutube: emptyToNull(data.socialYoutube),
        defaultLocale: data.defaultLocale,
        defaultCurrency: data.defaultCurrency,
        enableGuestCheckout: data.enableGuestCheckout,
        enableReviews: data.enableReviews,
        maintenanceMode: data.maintenanceMode,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "settings.update",
      entity: "SiteSettings",
      entityId: settings.id,
      metadata: { siteName: settings.siteName, maintenanceMode: settings.maintenanceMode },
    });

    updateTag(SITE_SETTINGS_TAG);
    revalidatePath("/admin/settings");
    for (const locale of ["fr", "en", "ar"] as const) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/contact`);
      revalidatePath(`/${locale}/shop`);
      revalidatePath(`/${locale}/about`);
    }
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateStaffRole(
  input: UpdateStaffRoleInput,
): Promise<SystemActionResult> {
  try {
    const user = await assertPermission("users.manage");
    if (user.role !== "SUPER_ADMIN") {
      return { ok: false, error: "Only super admins can change staff roles." };
    }

    const data = updateStaffRoleSchema.parse(input);

    if (data.userId === user.id) {
      return { ok: false, error: "You cannot change your own role." };
    }

    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) {
      return { ok: false, error: "User not found." };
    }

    if (!["SUPER_ADMIN", "ADMIN", "EDITOR", "SUPPORT", "ANALYST"].includes(target.role)) {
      return { ok: false, error: "Target user is not a staff member." };
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role },
      select: { id: true, email: true, role: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "user.role.update",
      entity: "User",
      entityId: updated.id,
      metadata: { email: updated.email, role: updated.role },
    });

    revalidatePath("/admin/system/roles");
    return { ok: true, data: { email: updated.email, role: updated.role } };
  } catch (error) {
    return actionError(error);
  }
}

export async function getCloudinaryUsageForAdmin() {
  await assertPermission("system.view");
  if (!isCloudinaryConfigured()) return null;
  try {
    return await getCloudinaryUsage();
  } catch {
    return null;
  }
}
