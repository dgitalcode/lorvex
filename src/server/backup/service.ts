import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, writeSystemLog } from "@/server/services/audit";
import { checkRateLimit } from "@/server/services/security";
import {
  checksumMatches,
  decryptBackupPayload,
  encryptBackupPayload,
  gzipJson,
  gunzipJson,
  sha256Hex,
} from "@/server/backup/crypto";
import {
  isAutomatedLogicalRestoreEnabled,
  isBackupStorageConfigured,
} from "@/server/backup/config";
import { createBackupStorage } from "@/server/backup/storage";
import {
  assertSafeLogicalDump,
  createLogicalDump,
  isLogicalDump,
} from "@/server/backup/logical-dump";
import {
  BACKUP_STATUS,
  BACKUP_TYPE,
  CHECKSUM_ALGORITHM,
  DEFAULT_RETENTION,
  RESTORE_CONFIRMATION_PHRASE,
  RETENTION_CLASS,
  type BackupPipelineStep,
  type LogicalDumpV1,
  type RetentionClass,
} from "@/server/backup/types";

const LOCK_KEY = "backup.operation.lock";

export function isRestorableBackup(record: {
  type: string;
  status: string;
  storageKey: string | null;
  encrypted: boolean;
  checksum: string | null;
}) {
  return (
    (record.type === BACKUP_TYPE.LOGICAL ||
      record.type === BACKUP_TYPE.PG_DUMP ||
      record.type === BACKUP_TYPE.SAFETY) &&
    record.status === BACKUP_STATUS.READY &&
    Boolean(record.storageKey) &&
    record.encrypted &&
    Boolean(record.checksum)
  );
}

export function isLegacyBackup(record: {
  type?: string | null;
  storageKey?: string | null;
}) {
  return record.type === BACKUP_TYPE.LEGACY || !record.storageKey;
}

export async function markLegacyBackupRecords() {
  await prisma.backupRecord.updateMany({
    where: {
      storageKey: null,
      status: { in: ["PENDING", "COMPLETED", BACKUP_STATUS.LEGACY] },
    },
    data: {
      type: BACKUP_TYPE.LEGACY,
      status: BACKUP_STATUS.LEGACY,
    },
  });
}

async function requestMeta() {
  try {
    const h = await headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

async function acquireBackupLock(mode: "RUNNING" | "RESTORING") {
  await prisma.scheduledJob.upsert({
    where: { key: LOCK_KEY },
    create: {
      key: LOCK_KEY,
      name: "Backup operation lock",
      status: "IDLE",
    },
    update: {},
  });
  const claimed = await prisma.scheduledJob.updateMany({
    where: { key: LOCK_KEY, status: { notIn: ["RUNNING", "RESTORING"] } },
    data: { status: mode, lastRunAt: new Date(), lastError: null },
  });
  if (claimed.count === 0) {
    throw new Error("Another backup or restore is already running.");
  }
}

async function releaseBackupLock() {
  await prisma.scheduledJob.updateMany({
    where: { key: LOCK_KEY },
    data: { status: "IDLE" },
  });
}

function retentionClassForTrigger(trigger: "manual" | "cron" | "safety"): RetentionClass {
  if (trigger === "safety") return RETENTION_CLASS.safety;
  if (trigger === "manual") return RETENTION_CLASS.manual;
  const now = new Date();
  if (now.getUTCDate() === 1) return RETENTION_CLASS.monthly;
  if (now.getUTCDay() === 0) return RETENTION_CLASS.weekly;
  return RETENTION_CLASS.daily;
}

function storageKeyFor(filename: string) {
  return `lorvex/backups/${filename.replace(/[^A-Za-z0-9._-]/g, "-")}`;
}

export function selectRetentionDeletions<T extends { id: string }>(
  newestFirst: T[],
  keep: number,
  restorableTotal: number,
) {
  if (keep < 1) return [];
  const extra = newestFirst.slice(keep);
  const maxDeletable = Math.max(0, restorableTotal - 1);
  return extra.slice(0, maxDeletable);
}

export function snapshotIsSafe(snapshot: unknown) {
  const serialized = JSON.stringify(snapshot ?? {});
  return (
    !/DATABASE_URL/i.test(serialized) &&
    !/BACKUP_ENCRYPTION_KEY/i.test(serialized) &&
    !/passwordHash/i.test(serialized)
  );
}

export async function runBackupPipeline(input: {
  userId?: string | null;
  trigger: "manual" | "cron" | "safety";
  skipLock?: boolean;
}) {
  if (!isBackupStorageConfigured()) {
    throw new Error(
      "Backup storage is not configured. Set BACKUP_STORAGE_PROVIDER, BACKUP_STORAGE_* and BACKUP_ENCRYPTION_KEY.",
    );
  }

  const limited = await checkRateLimit({
    key: `backup:create:${input.userId ?? "cron"}`,
    limit: 4,
    windowMs: 10 * 60_000,
  });
  if (!limited.allowed) {
    throw new Error("Backup rate limit reached. Try again later.");
  }

  if (!input.skipLock) {
    await acquireBackupLock("RUNNING");
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const nonce = randomBytes(8).toString("hex");
  const filename = `lorvex-${input.trigger === "safety" ? "safety" : "backup"}-${timestamp}-${nonce}.lvxb`;
  const record = await prisma.backupRecord.create({
    data: {
      filename,
      path: storageKeyFor(filename),
      status: BACKUP_STATUS.RUNNING,
      type: input.trigger === "safety" ? BACKUP_TYPE.SAFETY : BACKUP_TYPE.LOGICAL,
      storageProvider: createBackupStorage().provider,
      encrypted: true,
      retentionClass: retentionClassForTrigger(input.trigger),
      createdBy: input.userId ?? null,
      checksumAlgorithm: CHECKSUM_ALGORITHM,
    },
  });

  const steps: BackupPipelineStep[] = [];
  try {
    steps.push("preparing");
    const storage = createBackupStorage();

    steps.push("snapshot");
    const started = Date.now();
    const dump = await createLogicalDump();
    const compressed = gzipJson(dump);

    steps.push("encrypting");
    const encrypted = encryptBackupPayload(compressed);
    const checksum = sha256Hex(encrypted);
    const key = storageKeyFor(filename);

    steps.push("uploading");
    await storage.put(key, encrypted, "application/octet-stream");

    steps.push("verifying");
    const remote = await storage.head(key);
    if (!remote || remote.sizeBytes !== encrypted.length) {
      throw new Error("Uploaded backup object size mismatch.");
    }
    const downloaded = await storage.get(key);
    if (!checksumMatches(sha256Hex(downloaded), checksum)) {
      await storage.remove(key).catch(() => undefined);
      throw new Error("Uploaded backup checksum mismatch.");
    }

    const completed = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: BACKUP_STATUS.READY,
        path: key,
        storageKey: key,
        storageProvider: storage.provider,
        sizeBytes: encrypted.length,
        checksum,
        checksumAlgorithm: CHECKSUM_ALGORITHM,
        encrypted: true,
        completedAt: new Date(),
        error: null,
        snapshot: {
          format: dump.format,
          generatedAt: dump.generatedAt,
          schemaVersion: dump.schemaVersion,
          tableCount: dump.tableOrder.length,
          rowCounts: dump.rowCounts,
          skippedModels: dump.skippedModels,
          durationMs: Date.now() - started,
          trigger: input.trigger,
          mediaNote: dump.notes.mediaBinaries,
        },
      },
    });

    steps.push("completed");
    const meta = await requestMeta();
    await writeAuditLog({
      userId: input.userId,
      action: "system.backup.create",
      entity: "BackupRecord",
      entityId: completed.id,
      metadata: {
        filename,
        type: completed.type,
        sizeBytes: completed.sizeBytes,
        checksumAlgorithm: CHECKSUM_ALGORITHM,
        trigger: input.trigger,
        step: "completed",
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await writeSystemLog({
      level: "info",
      source: "system.backup",
      message: "Encrypted logical backup stored externally",
      meta: { id: completed.id, filename, trigger: input.trigger },
    });

    await applyRetentionPolicy().catch(() => undefined);
    return { record: completed, steps };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: BACKUP_STATUS.FAILED,
        error: message,
        completedAt: new Date(),
      },
    });
    await writeSystemLog({
      level: "error",
      source: "system.backup",
      message: "Backup failed",
      meta: { id: record.id, error: message },
    });
    throw error;
  } finally {
    if (!input.skipLock) {
      await releaseBackupLock();
    }
  }
}

export async function getVerifiedBackupFile(id: string, userId: string) {
  const record = await prisma.backupRecord.findUnique({ where: { id } });
  if (!record || !isRestorableBackup(record) || !record.storageKey) {
    throw new Error("Backup is not downloadable.");
  }
  const storage = createBackupStorage();
  const object = await storage.get(record.storageKey);
  if (!checksumMatches(sha256Hex(object), record.checksum ?? "")) {
    throw new Error("Backup failed integrity verification.");
  }
  const meta = await requestMeta();
  await writeAuditLog({
    userId,
    action: "system.backup.download",
    entity: "BackupRecord",
    entityId: record.id,
    metadata: { filename: record.filename },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { filename: record.filename, body: object };
}

export async function deleteBackupRecord(id: string, userId: string) {
  const restorable = await prisma.backupRecord.count({
    where: {
      status: BACKUP_STATUS.READY,
      type: { in: [BACKUP_TYPE.LOGICAL, BACKUP_TYPE.PG_DUMP, BACKUP_TYPE.SAFETY] },
      storageKey: { not: null },
    },
  });
  const record = await prisma.backupRecord.findUnique({ where: { id } });
  if (!record) throw new Error("Backup not found.");
  if (isRestorableBackup(record) && restorable <= 1) {
    throw new Error("Cannot delete the only restorable backup.");
  }
  if (record.storageKey) {
    await createBackupStorage().remove(record.storageKey).catch(() => undefined);
  }
  await prisma.backupRecord.delete({ where: { id } });
  const meta = await requestMeta();
  await writeAuditLog({
    userId,
    action: "system.backup.delete",
    entity: "BackupRecord",
    entityId: id,
    metadata: { filename: record.filename, type: record.type },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export function assertRestoreConfirmation(phrase: string) {
  if (phrase.trim() !== RESTORE_CONFIRMATION_PHRASE) {
    throw new Error(`Type ${RESTORE_CONFIRMATION_PHRASE} to confirm restore.`);
  }
}

async function loadVerifiedDump(storageKey: string, checksum: string) {
  const storage = createBackupStorage();
  const file = await storage.get(storageKey);
  if (!checksumMatches(sha256Hex(file), checksum)) {
    throw new Error("Backup failed integrity verification.");
  }
  const dump = gunzipJson<LogicalDumpV1>(decryptBackupPayload(file));
  if (!isLogicalDump(dump)) {
    throw new Error("Backup contents are not a valid logical dump.");
  }
  assertSafeLogicalDump(dump);
  return dump;
}

export async function validateBackupRecord(input: { id: string; userId: string }) {
  const record = await prisma.backupRecord.findUnique({ where: { id: input.id } });
  if (!record || !isRestorableBackup(record) || !record.storageKey || !record.checksum) {
    throw new Error("This backup cannot be verified (legacy or incomplete).");
  }
  const limited = await checkRateLimit({
    key: `backup:validate:${input.userId}`,
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!limited.allowed) {
    throw new Error("Backup verification rate limit reached.");
  }
  const dump = await loadVerifiedDump(record.storageKey, record.checksum);
  const meta = await requestMeta();
  await writeAuditLog({
    userId: input.userId,
    action: "system.backup.verify",
    entity: "BackupRecord",
    entityId: record.id,
    metadata: {
      filename: record.filename,
      tableCount: dump.tableOrder.length,
      format: dump.format,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return {
    ok: true as const,
    format: dump.format,
    generatedAt: dump.generatedAt,
    tableCount: dump.tableOrder.length,
    rowCounts: dump.rowCounts,
    schemaVersion: dump.schemaVersion,
  };
}

export async function restoreBackupRecord(input: {
  id: string;
  userId: string;
  confirmation: string;
}): Promise<never> {
  assertRestoreConfirmation(input.confirmation);

  const limited = await checkRateLimit({
    key: `backup:restore:${input.userId}`,
    limit: 2,
    windowMs: 30 * 60_000,
  });
  if (!limited.allowed) {
    throw new Error("Restore rate limit reached.");
  }

  const meta = await requestMeta();
  await writeAuditLog({
    userId: input.userId,
    action: "system.backup.restore.denied",
    entity: "BackupRecord",
    entityId: input.id,
    metadata: {
      reason: isAutomatedLogicalRestoreEnabled()
        ? "logical_restore_not_used_on_this_path"
        : "automated_restore_disabled",
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  if (!isAutomatedLogicalRestoreEnabled()) {
    throw new Error(
      "Automated database restore is disabled. Verify the backup, then recover with a Neon point-in-time or branch restore onto a non-production database.",
    );
  }

  throw new Error(
    "Automated logical restore is reserved for isolated recovery drills. It is not available in the admin UI.",
  );
}

export async function applyRetentionPolicy() {
  const classes: Array<keyof typeof DEFAULT_RETENTION> = [
    "daily",
    "weekly",
    "monthly",
    "safety",
  ];
  for (const retentionClass of classes) {
    const keep = DEFAULT_RETENTION[retentionClass];
    const rows = await prisma.backupRecord.findMany({
      where: {
        retentionClass,
        status: BACKUP_STATUS.READY,
        storageKey: { not: null },
        type: { in: [BACKUP_TYPE.LOGICAL, BACKUP_TYPE.PG_DUMP, BACKUP_TYPE.SAFETY] },
      },
      orderBy: { createdAt: "desc" },
    });
    const restorableTotal = await prisma.backupRecord.count({
      where: {
        status: BACKUP_STATUS.READY,
        type: { in: [BACKUP_TYPE.LOGICAL, BACKUP_TYPE.PG_DUMP, BACKUP_TYPE.SAFETY] },
        storageKey: { not: null },
      },
    });
    const extra = selectRetentionDeletions(rows, keep, restorableTotal);
    for (const row of extra) {
      if (row.storageKey) {
        await createBackupStorage().remove(row.storageKey).catch(() => undefined);
      }
      await prisma.backupRecord.delete({ where: { id: row.id } });
    }
  }
}

export async function backupHealthSummary() {
  await markLegacyBackupRecords();
  const [ready, failed, legacy, lastReady, lock] = await Promise.all([
    prisma.backupRecord.count({
      where: {
        status: BACKUP_STATUS.READY,
        type: { in: [BACKUP_TYPE.LOGICAL, BACKUP_TYPE.PG_DUMP, BACKUP_TYPE.SAFETY] },
      },
    }),
    prisma.backupRecord.count({ where: { status: BACKUP_STATUS.FAILED } }),
    prisma.backupRecord.count({
      where: { status: BACKUP_STATUS.LEGACY, type: BACKUP_TYPE.LEGACY },
    }),
    prisma.backupRecord.findFirst({
      where: { status: BACKUP_STATUS.READY, storageKey: { not: null } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.scheduledJob.findUnique({ where: { key: LOCK_KEY } }),
  ]);
  const cron = await prisma.scheduledJob.findUnique({
    where: { key: "backup.cron.daily" },
  });
  return {
    ready,
    failed,
    legacy,
    lastSuccessfulAt: lastReady?.completedAt?.toISOString() ?? null,
    nextScheduledAt: cron?.nextRunAt?.toISOString() ?? null,
    operationLock: lock?.status ?? "IDLE",
  };
}
