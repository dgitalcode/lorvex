import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const windowStart = new Date(
    Math.floor(now / input.windowMs) * input.windowMs,
  );

  // Prefer DB for multi-instance; fall back to memory
  try {
    const hit = await prisma.rateLimitHit.upsert({
      where: {
        key_windowStart: {
          key: input.key,
          windowStart,
        },
      },
      create: { key: input.key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });
    return {
      allowed: hit.count <= input.limit,
      remaining: Math.max(0, input.limit - hit.count),
      resetAt: windowStart.getTime() + input.windowMs,
    };
  } catch {
    const existing = memoryBuckets.get(input.key);
    if (!existing || existing.resetAt <= now) {
      memoryBuckets.set(input.key, {
        count: 1,
        resetAt: now + input.windowMs,
      });
      return { allowed: true, remaining: input.limit - 1, resetAt: now + input.windowMs };
    }
    existing.count += 1;
    return {
      allowed: existing.count <= input.limit,
      remaining: Math.max(0, input.limit - existing.count),
      resetAt: existing.resetAt,
    };
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
