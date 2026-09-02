import type { Prisma } from "@prisma/client";
import { writeSystemLog } from "@/server/services/audit";

const BLOCKED_KEY = /password|secret|token|authorization|cookie|database_url|accessToken|idempotency/i;

export function sanitizeOpsMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (BLOCKED_KEY.test(key)) continue;
    if (typeof value === "string" && value.length > 400) {
      out[key] = value.slice(0, 400);
      continue;
    }
    if (value !== null && typeof value === "object") continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function logOps(input: {
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  meta?: Record<string, unknown>;
}) {
  const meta = sanitizeOpsMeta(input.meta);
  const line = JSON.stringify({
    level: input.level,
    source: input.source,
    message: input.message,
    meta,
  });
  if (input.level === "error") console.error(line);
  else if (input.level === "warn") console.warn(line);
  try {
    await writeSystemLog({
      level: input.level,
      source: input.source,
      message: input.message,
      meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
    });
  } catch {
    /* logging must never break checkout */
  }
}
