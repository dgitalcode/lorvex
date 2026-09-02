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
import { getBackupConfigStatus } from "@/server/backup/config";
import {
  backupHealthSummary,
  markLegacyBackupRecords,
} from "@/server/backup/service";
import { SystemOperationsPanel } from "@/components/admin/system/system-operations-panel";

export const metadata = { title: "System health" };

export default async function AdminSystemPage() {
  const user = await requirePermission("system.view");

  await ensurePermissionsSeeded();
  await markLegacyBackupRecords();

  const [
    latestChecks,
    jobs,
    backups,
    cloudinaryUsage,
    cloudinaryLive,
    backupHealth,
  ] = await Promise.all([
    prisma.systemHealthCheck.findMany({
      orderBy: { checkedAt: "desc" },
      take: 12,
    }),
    prisma.scheduledJob.findMany({ orderBy: { name: "asc" } }),
    prisma.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    isCloudinaryConfigured() ? getCloudinaryUsage().catch(() => null) : null,
    isCloudinaryConfigured()
      ? verifyCloudinaryConnection()
      : Promise.resolve({ ok: false as const, error: "missing env" }),
    backupHealthSummary(),
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
        id: backup.id,
        filename: backup.filename,
        status: backup.status,
        type: backup.type,
        sizeBytes: backup.sizeBytes,
        storageProvider: backup.storageProvider,
        checksum: backup.checksum,
        checksumAlgorithm: backup.checksumAlgorithm,
        encrypted: backup.encrypted,
        retentionClass: backup.retentionClass,
        error: backup.error,
        createdAt: backup.createdAt.toISOString(),
        completedAt: backup.completedAt?.toISOString() ?? null,
      }))}
      cloudinaryUsage={cloudinaryUsage}
      emailStatus={emailStatus}
      cloudinaryStatus={cloudinaryStatus}
      backupHealth={backupHealth}
      backupStorage={getBackupConfigStatus()}
    />
  );
}
