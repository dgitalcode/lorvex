import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authorizeBackupCron,
  isBackupStorageConfigured,
} from "@/server/backup/config";
import { runBackupPipeline } from "@/server/backup/service";
import { BACKUP_STATUS, BACKUP_TYPE } from "@/server/backup/types";

export const maxDuration = 300;

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function GET(request: Request) {
  if (!authorizeBackupCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isBackupStorageConfigured()) {
    return NextResponse.json(
      { error: "Backup storage is not configured." },
      { status: 503 },
    );
  }

  const now = new Date();
  const recent = await prisma.backupRecord.findFirst({
    where: {
      status: BACKUP_STATUS.READY,
      type: BACKUP_TYPE.LOGICAL,
      createdBy: null,
      completedAt: { gte: new Date(now.getTime() - 20 * 60 * 60_000) },
    },
    orderBy: { completedAt: "desc" },
  });
  if (recent) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      id: recent.id,
      reason: "already_completed",
    });
  }

  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(3, 0, 0, 0);

  try {
    const result = await runBackupPipeline({ trigger: "cron" });
    await prisma.scheduledJob.upsert({
      where: { key: "backup.cron.daily" },
      create: {
        key: "backup.cron.daily",
        name: "Daily encrypted backup",
        cron: "0 3 * * *",
        status: "IDLE",
        lastRunAt: now,
        nextRunAt: next,
      },
      update: {
        status: "IDLE",
        lastRunAt: now,
        nextRunAt: next,
        lastError: null,
      },
    });
    return NextResponse.json({
      ok: true,
      id: result.record.id,
      filename: result.record.filename,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await prisma.scheduledJob.upsert({
      where: { key: "backup.cron.daily" },
      create: {
        key: "backup.cron.daily",
        name: "Daily encrypted backup",
        cron: "0 3 * * *",
        status: "FAILED",
        lastRunAt: now,
        nextRunAt: next,
        lastError: message,
      },
      update: {
        status: "FAILED",
        lastRunAt: now,
        nextRunAt: next,
        lastError: message,
      },
    });
    const status = message.includes("already running") ? 409 : 500;
    return NextResponse.json({ ok: false, error: "Backup failed." }, { status });
  }
}
