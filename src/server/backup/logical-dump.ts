import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  backupModelNames,
  delegate,
  orderByForModel,
  type BackupClient,
} from "@/server/backup/db";
import { BACKUP_SKIP_MODELS, type LogicalDumpV1 } from "@/server/backup/types";

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return { __t: "Date", v: value.toISOString() };
  if (typeof value === "bigint") return { __t: "BigInt", v: value.toString() };
  if (value instanceof Prisma.Decimal) return { __t: "Decimal", v: value.toString() };
  if (Buffer.isBuffer(value)) return { __t: "Bytes", v: value.toString("base64") };
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        serializeValue(v),
      ]),
    );
  }
  return value;
}

export function deserializeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deserializeValue);
  if (value && typeof value === "object") {
    const record = value as { __t?: string; v?: string };
    if (record.__t === "Date" && record.v) return new Date(record.v);
    if (record.__t === "BigInt" && record.v) return BigInt(record.v);
    if (record.__t === "Decimal" && record.v) return new Prisma.Decimal(record.v);
    if (record.__t === "Bytes" && record.v) return Buffer.from(record.v, "base64");
    return Object.fromEntries(
      Object.entries(record).map(([k, v]) => [k, deserializeValue(v)]),
    );
  }
  return value;
}

export { backupModelNames };

export function dumpModelNames() {
  const skip = new Set<string>(BACKUP_SKIP_MODELS);
  return backupModelNames().filter((name) => !skip.has(name));
}

export async function createLogicalDump(
  client: BackupClient = prisma,
): Promise<LogicalDumpV1> {
  const tableOrder = dumpModelNames();
  const tables: Record<string, unknown[]> = {};
  const pageSize = 500;

  for (const name of tableOrder) {
    const rows: unknown[] = [];
    const orderBy = orderByForModel(name);
    let skip = 0;
    for (;;) {
      const batch = await delegate(client, name).findMany({
        take: pageSize,
        skip,
        ...(orderBy ? { orderBy } : {}),
      });
      if (!batch.length) break;
      rows.push(...batch.map((row) => serializeValue(row)));
      skip += batch.length;
      if (batch.length < pageSize) break;
    }
    tables[name] = rows;
  }

  const rowCounts = Object.fromEntries(
    tableOrder.map((name) => [name, tables[name]?.length ?? 0]),
  );

  return {
    format: "lorvex-logical-v1",
    generatedAt: new Date().toISOString(),
    schemaVersion: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    tables,
    tableOrder,
    rowCounts,
    skippedModels: [...BACKUP_SKIP_MODELS],
    notes: {
      mediaBinaries:
        "Cloudinary objects are not included; only MediaAsset metadata/URLs.",
      schema:
        "Logical Prisma dump. Restore rebuilds rows; indexes/constraints come from the live Prisma schema.",
      secrets:
        "Env secrets and API keys are not included. passwordHash values are one-way hashes.",
    },
  };
}

export function isLogicalDump(value: unknown): value is LogicalDumpV1 {
  if (!value || typeof value !== "object") return false;
  const dump = value as LogicalDumpV1;
  return (
    dump.format === "lorvex-logical-v1" &&
    dump.tables != null &&
    typeof dump.tables === "object" &&
    Array.isArray(dump.tableOrder)
  );
}

export function assertSafeLogicalDump(dump: LogicalDumpV1) {
  const allowed = new Set(backupModelNames());
  const skip = new Set<string>(BACKUP_SKIP_MODELS);
  if (!dump.tableOrder.length) {
    throw new Error("Backup does not contain any tables.");
  }
  for (const name of dump.tableOrder) {
    if (!allowed.has(name)) {
      throw new Error("Backup contains an unknown table.");
    }
    if (skip.has(name)) {
      throw new Error("Backup contains a disallowed table.");
    }
    if (!Array.isArray(dump.tables[name])) {
      throw new Error("Backup table payload is invalid.");
    }
  }
}
