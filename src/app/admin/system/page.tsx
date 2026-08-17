import { prisma } from "@/lib/prisma";
import {
  getCloudinaryConfigStatus,
  getCloudinaryUsage,
  isCloudinaryConfigured,
  verifyCloudinaryConnection,
} from "@/lib/cloudinary";
import { getEmailConfigStatus } from "@/lib/email";
import { requirePermission } from "@/server/auth/require-admin";
import { roleHasPermission } from "@/server/auth/permissions";
import { ensurePermissionsSeeded } from "@/server/actions/admin/system";
import { SystemOperationsPanel } from "@/components/admin/system/system-operations-panel";

export const metadata = { title: "System health" };

export default async function AdminSystemPage() {
  const user = await requirePermission("system.view");

  await ensurePermissionsSeeded();

  const [
    latestChecks,
    jobs,
    backups,
    cloudinaryUsage,
    cloudinaryLive,
  ] = await Promise.all([
    prisma.systemHealthCheck.findMany({
      orderBy: { checkedAt: "desc" },
      take: 12,
    }),
    prisma.scheduledJob.findMany({ orderBy: { name: "asc" } }),
    prisma.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    isCloudinaryConfigured() ? getCloudinaryUsage().catch(() => null) : null,
    isCloudinaryConfigured()
      ? verifyCloudinaryConnection()
      : Promise.resolve({ ok: false as const, error: "missing env" }),
  ]);

  const emailStatus = getEmailConfigStatus();
  const cloudinaryStatus = {
    ...getCloudinaryConfigStatus(),
    configured: cloudinaryLive.ok,
    error: cloudinaryLive.ok ? null : (cloudinaryLive.error ?? "Not connected"),
  };

  return (
    <SystemOperationsPanel
      canManage={roleHasPermission(user.role, "system.manage")}
      latestChecks={latestChecks.map((check) => ({
        ...check,
        checkedAt: check.checkedAt.toISOString(),
      }))}
      jobs={jobs.map((job) => ({
        ...job,
        lastRunAt: job.lastRunAt?.toISOString() ?? null,
        nextRunAt: job.nextRunAt?.toISOString() ?? null,
      }))}
      backups={backups.map((backup) => ({
        ...backup,
        createdAt: backup.createdAt.toISOString(),
      }))}
      cloudinaryUsage={cloudinaryUsage}
      emailStatus={emailStatus}
      cloudinaryStatus={cloudinaryStatus}
    />
  );
}
