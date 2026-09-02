import { Prisma, PrismaClient } from "@prisma/client";

export type BackupClient = (PrismaClient | Prisma.TransactionClient) & {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
};

type PrismaDelegate = {
  findMany: (args?: {
    take?: number;
    skip?: number;
    orderBy?: unknown;
  }) => Promise<unknown[]>;
  createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
  update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
  deleteMany: () => Promise<unknown>;
};

export function backupModelNames() {
  return Prisma.dmmf.datamodel.models.map((model) => model.name);
}

export function modelDmmf(modelName: string) {
  const model = Prisma.dmmf.datamodel.models.find((entry) => entry.name === modelName);
  if (!model) throw new Error(`Unknown Prisma model ${modelName}.`);
  return model;
}

export function delegate(client: BackupClient, modelName: string): PrismaDelegate {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const model = (client as unknown as Record<string, PrismaDelegate | undefined>)[key];
  if (!model?.findMany || !model.createMany || !model.deleteMany) {
    throw new Error(`Prisma model ${modelName} is not available.`);
  }
  return model;
}

export function orderByForModel(modelName: string) {
  const model = modelDmmf(modelName);
  const idField = model.fields.find((field) => field.isId);
  if (idField) return { [idField.name]: "asc" as const };
  const pk = model.primaryKey?.fields;
  if (pk?.length) return pk.map((name) => ({ [name]: "asc" as const }));
  const unique = model.fields.find((field) => field.isUnique);
  if (unique) return { [unique.name]: "asc" as const };
  return undefined;
}

export function scalarSelfFkFields(modelName: string) {
  const model = modelDmmf(modelName);
  return model.fields
    .filter(
      (field) =>
        field.kind === "object" &&
        field.type === modelName &&
        Boolean(field.relationFromFields?.length),
    )
    .flatMap((field) => field.relationFromFields ?? []);
}

export function foreignModelDeps(modelName: string) {
  const model = modelDmmf(modelName);
  return [
    ...new Set(
      model.fields
        .filter(
          (field) =>
            field.kind === "object" &&
            field.type !== modelName &&
            Boolean(field.relationFromFields?.length),
        )
        .map((field) => field.type),
    ),
  ];
}

export function topologicalTableOrder(names: string[]) {
  const allowed = new Set(names);
  const remaining = new Set(names);
  const ordered: string[] = [];
  let guard = 0;
  while (remaining.size > 0) {
    guard += 1;
    if (guard > names.length + 5) {
      ordered.push(...remaining);
      break;
    }
    let progressed = false;
    for (const name of [...remaining]) {
      const unmet = foreignModelDeps(name).filter(
        (dep) => allowed.has(dep) && remaining.has(dep),
      );
      if (unmet.length) continue;
      ordered.push(name);
      remaining.delete(name);
      progressed = true;
    }
    if (!progressed) {
      ordered.push(...remaining);
      break;
    }
  }
  return ordered;
}

export function quoteIdent(name: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error("Invalid table name in backup.");
  }
  return `"${name}"`;
}
