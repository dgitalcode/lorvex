import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logOps } from "@/lib/ops-log";

export function ipFromRequest(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function getClientIp() {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export type RateLimitStore = {
  increment(key: string, windowStart: Date): Promise<number>;
  pruneExpired(before: Date): Promise<void>;
};

export function rateLimitWindowStart(now: number, windowMs: number) {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

export function hashedRateLimitKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function evaluateRateLimitHit(input: {
  count: number;
  limit: number;
  windowStart: Date;
  windowMs: number;
  now: number;
}): RateLimitResult {
  const resetAt = input.windowStart.getTime() + input.windowMs;
  return {
    allowed: input.count <= input.limit,
    remaining: Math.max(0, input.limit - input.count),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - input.now) / 1000)),
  };
}

function compositeKey(key: string, windowStart: Date) {
  return `${key}|${windowStart.getTime()}`;
}

/** Test/local fallback only. Production uses Postgres `RateLimitHit`. */
export function createAtomicMemoryRateLimitStore(): RateLimitStore {
  const counts = new Map<string, number>();
  let chain = Promise.resolve();
  return {
    increment(key, windowStart) {
      const id = compositeKey(key, windowStart);
      const run = chain.then(() => {
        const next = (counts.get(id) ?? 0) + 1;
        counts.set(id, next);
        return next;
      });
      chain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    async pruneExpired(before) {
      const cutoff = before.getTime();
      for (const id of [...counts.keys()]) {
        const stamp = Number(id.slice(id.lastIndexOf("|") + 1));
        if (Number.isFinite(stamp) && stamp < cutoff) counts.delete(id);
      }
    },
  };
}

async function prismaIncrement(key: string, windowStart: Date) {
  try {
    const hit = await prisma.rateLimitHit.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });
    return hit.count;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const hit = await prisma.rateLimitHit.update({
        where: { key_windowStart: { key, windowStart } },
        data: { count: { increment: 1 } },
      });
      return hit.count;
    }
    throw error;
  }
}

const prismaStore: RateLimitStore = {
  increment: prismaIncrement,
  pruneExpired: async (before) => {
    await prisma.rateLimitHit.deleteMany({
      where: { windowStart: { lt: before } },
    });
  },
};

const localFallbackStore = createAtomicMemoryRateLimitStore();

function isVercelProduction() {
  return process.env.VERCEL_ENV === "production";
}

export function rateLimitRetryAfterHeader(result: RateLimitResult) {
  return { "Retry-After": String(result.retryAfterSeconds) };
}

export async function checkRateLimit(
  input: {
    key: string;
    limit: number;
    windowMs: number;
    now?: number;
  },
  store?: RateLimitStore,
) {
  const now = input.now ?? Date.now();
  const windowStart = rateLimitWindowStart(now, input.windowMs);
  const storageKey = hashedRateLimitKey(input.key);
  const activeStore = store ?? prismaStore;

  const finish = (count: number): RateLimitResult =>
    evaluateRateLimitHit({
      count,
      limit: input.limit,
      windowStart,
      windowMs: input.windowMs,
      now,
    });

  try {
    const count = await activeStore.increment(storageKey, windowStart);
    if (!store && Math.random() < 0.02) {
      const cutoff = new Date(now - Math.max(input.windowMs * 2, 48 * 60 * 60_000));
      void activeStore.pruneExpired(cutoff).catch(() => undefined);
    }
    return finish(count);
  } catch {
    if (store) throw new Error("RATE_LIMIT_STORE_FAILED");
    if (isVercelProduction()) {
      await logOps({
        level: "error",
        source: "rate-limit",
        message: "durable_increment_failed",
      });
      return {
        allowed: true,
        remaining: input.limit,
        resetAt: windowStart.getTime() + input.windowMs,
        retryAfterSeconds: 1,
      };
    }
    const count = await localFallbackStore.increment(storageKey, windowStart);
    return finish(count);
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function recordLoginAttempt(input: {
  userId: string;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  reason?: string | null;
}) {
  await prisma.loginHistory.create({
    data: {
      userId: input.userId,
      success: input.success,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      reason: input.reason ?? null,
    },
  });

  if (!input.success && input.ip) {
    const since = new Date(Date.now() - 15 * 60_000);
    const fails = await prisma.loginHistory.count({
      where: {
        userId: input.userId,
        success: false,
        createdAt: { gte: since },
      },
    });
    if (fails >= 5) {
      await prisma.suspiciousActivity.create({
        data: {
          userId: input.userId,
          ip: input.ip,
          type: "BRUTE_FORCE",
          detail: `${fails} failed logins in 15 minutes`,
        },
      });
    }
  }
}

export async function upsertDeviceSession(input: {
  userId: string;
  token: string;
  userAgent?: string | null;
  ip?: string | null;
  deviceLabel?: string | null;
}) {
  const tokenHash = hashToken(input.token);
  return prisma.deviceSession.upsert({
    where: { tokenHash },
    create: {
      userId: input.userId,
      tokenHash,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
      deviceLabel: input.deviceLabel ?? null,
    },
    update: {
      lastActiveAt: new Date(),
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
      revokedAt: null,
    },
  });
}
