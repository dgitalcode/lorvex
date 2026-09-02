import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  delegate,
  quoteIdent,
  scalarSelfFkFields,
  topologicalTableOrder,
  type BackupClient,
} from "@/server/backup/db";
import { deserializeValue, isLogicalDump, assertSafeLogicalDump } from "@/server/backup/logical-dump";
import type { LogicalDumpV1 } from "@/server/backup/types";

function idWhere(row: Record<string, unknown>) {
  if (typeof row.id === "string" || typeof row.id === "number") {
    return { id: row.id };
  }
  throw new Error("Cannot update restored row without an id.");
}

function isFkError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /foreign key|Foreign key|ForeignKeyConstraint/i.test(message);
}

async function insertTable(
  client: BackupClient,
  name: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return;
  const selfFks = scalarSelfFkFields(name);
  const insertRows = rows.map((row) => {
    if (!selfFks.length) return row;
    const copy = { ...row };
    for (const field of selfFks) copy[field] = null;
    return copy;
  });

  for (let i = 0; i < insertRows.length; i += 250) {
    const chunk = insertRows.slice(i, i + 250);
    if (chunk.length) await delegate(client, name).createMany({ data: chunk });
  }

  if (!selfFks.length) return;
  for (const row of rows) {
    const data: Record<string, unknown> = {};
    for (const field of selfFks) {
      if (row[field] != null) data[field] = row[field];
    }
    if (!Object.keys(data).length) continue;
    await delegate(client, name).update({ where: idWhere(row), data });
  }
}

function savepointName(modelName: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(modelName)) {
    throw new Error("Invalid table name in backup.");
  }
  return `sp_${modelName}`;
}

async function insertAllTables(
  client: BackupClient,
  tableOrder: string[],
  dump: LogicalDumpV1,
) {
  const pending = new Map(
    tableOrder.map((name) => [
      name,
      ((dump.tables[name] ?? []) as unknown[]).map(
        (row) => deserializeValue(row) as Record<string, unknown>,
      ),
    ]),
  );

  let guard = 0;
  while (pending.size > 0) {
    guard += 1;
    if (guard > tableOrder.length + 8) {
      throw new Error(
        `Restore stalled with remaining tables: ${[...pending.keys()].join(", ")}`,
      );
    }
    let progressed = false;
    let lastError: unknown;
    for (const [name, rows] of [...pending.entries()]) {
      const sp = savepointName(name);
      await client.$executeRawUnsafe(`SAVEPOINT ${sp}`);
      try {
        await insertTable(client, name, rows);
        await client.$executeRawUnsafe(`RELEASE SAVEPOINT ${sp}`);
        pending.delete(name);
        progressed = true;
      } catch (error) {
        lastError = error;
        await client.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${sp}`);
        if (!isFkError(error)) throw error;
      }
    }
    if (!progressed) {
      const detail = lastError instanceof Error ? lastError.message : "unknown FK error";
      throw new Error(
        `Restore could not satisfy foreign-key order (${[...pending.keys()].join(", ")}): ${detail}`,
      );
    }
  }
}

export async function restoreLogicalDump(
  dump: unknown,
  client: BackupClient = prisma,
) {
  if (!isLogicalDump(dump)) {
    throw new Error("Backup payload is not a LORVEX logical dump.");
  }
  assertSafeLogicalDump(dump);

  const allowed = new Set(Prisma.dmmf.datamodel.models.map((model) => model.name));
  const requested = (dump.tableOrder.length
    ? dump.tableOrder
    : Object.keys(dump.tables)
  ).filter((name) => allowed.has(name));
  if (!requested.length) {
    throw new Error("Backup does not contain any known tables.");
  }
  const tableOrder = topologicalTableOrder(requested);
  const quoted = tableOrder.map(quoteIdent).join(", ");

  const run = async (tx: BackupClient) => {
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} CASCADE`);
    await insertAllTables(tx, tableOrder, dump);
    return { tables: tableOrder.length, format: dump.format };
  };

  if (typeof (client as PrismaClientLike).$transaction === "function") {
    return (client as PrismaClientLike).$transaction(run, {
      timeout: 180_000,
      maxWait: 15_000,
    });
  }
  return run(client);
}

type PrismaClientLike = {
  $transaction: (
    fn: (tx: BackupClient) => Promise<{ tables: number; format: string }>,
    options?: { timeout?: number; maxWait?: number },
  ) => Promise<{ tables: number; format: string }>;
};

export async function restoreFromLogicalDump(
  dump: LogicalDumpV1,
  client: BackupClient = prisma,
) {
  return restoreLogicalDump(dump, client);
}
