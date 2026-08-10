import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function writeSystemLog(input: {
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  meta?: Prisma.InputJsonValue | null;
}) {
  return prisma.systemLog.create({
    data: {
      level: input.level,
      source: input.source,
      message: input.message,
      meta: input.meta ?? undefined,
    },
  });
}
