"use server";

import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { compare } from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/services/audit";
import {
  checkRateLimit,
  recordLoginAttempt,
  upsertDeviceSession,
} from "@/server/services/security";
import {
  generateBackupCodes,
  hashBackupCode,
  verifyTwoFactorToken,
} from "@/server/services/two-factor";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  // JWT can outlive a DB reseed — force a clean re-login.
  if (!user) {
    await signOut({ redirect: false }).catch(() => undefined);
    throw new Error("UNAUTHORIZED");
  }

  return {
    id: user.id,
    email: user.email ?? session.user.email,
    name: user.name ?? session.user.name,
    passwordHash: user.passwordHash,
  };
}

async function clientKey(prefix: string, extra?: string) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${extra ?? ip}`;
}

export async function setupTwoFactor() {
  try {
    const user = await requireUser();
    const secret = generateSecret();
    const otpauth = generateURI({
      issuer: "LORVEX",
      label: user.email ?? user.id,
      secret,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await prisma.twoFactorAuth.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secret, enabled: false, backupCodes: [] },
      update: {
        secret,
        enabled: false,
        enabledAt: null,
        backupCodes: [],
      },
    });

    return { ok: true as const, secret, qrDataUrl };
  } catch {
    return {
      ok: false as const,
      error: "Session expired. Please sign in again.",
    };
  }
}

export async function enableTwoFactor(token: string) {
  try {
    const user = await requireUser();
    const row = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    if (!row) return { ok: false as const, error: "Setup required first." };

    const result = verifySync({ token, secret: row.secret });
    if (!result.valid) return { ok: false as const, error: "Invalid code." };

    const backups = generateBackupCodes(8);

    await prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: {
        enabled: true,
        enabledAt: new Date(),
        backupCodes: backups.map(hashBackupCode),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "2FA_ENABLED",
      entity: "User",
      entityId: user.id,
    });

    return { ok: true as const, backupCodes: backups };
  } catch {
    return {
      ok: false as const,
      error: "Session expired. Please sign in again.",
    };
  }
}

export async function disableTwoFactor(token: string) {
  try {
    const user = await requireUser();
    const row = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    if (!row?.enabled) return { ok: false as const, error: "2FA not enabled." };

    const limit = await checkRateLimit({
      key: await clientKey("auth:2fa-disable", user.id),
      limit: 10,
      windowMs: 15 * 60_000,
    });
    if (!limit.allowed) {
      return { ok: false as const, error: "Too many attempts. Try again later." };
    }

    const verified = await verifyTwoFactorToken({
      userId: user.id,
      secret: row.secret,
      token,
    });
    if (!verified.ok) return { ok: false as const, error: "Invalid code." };

    await prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: { enabled: false, enabledAt: null, backupCodes: [] },
    });

    await writeAuditLog({
      userId: user.id,
      action: "2FA_DISABLED",
      entity: "User",
      entityId: user.id,
    });

    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Session expired. Please sign in again.",
    };
  }
}

export async function regenerateBackupCodes(password: string) {
  try {
    const user = await requireUser();

    const limit = await checkRateLimit({
      key: await clientKey("auth:backup-regen", user.id),
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) {
      return { ok: false as const, error: "Too many attempts. Try again later." };
    }

    if (!user.passwordHash) {
      return { ok: false as const, error: "Password confirmation required." };
    }

    const passwordOk = await compare(password, user.passwordHash);
    if (!passwordOk) {
      return { ok: false as const, error: "Invalid password." };
    }

    const row = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    if (!row?.enabled) {
      return { ok: false as const, error: "2FA not enabled." };
    }

    const backups = generateBackupCodes(8);
    await prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: { backupCodes: backups.map(hashBackupCode) },
    });

    await writeAuditLog({
      userId: user.id,
      action: "2FA_BACKUP_REGENERATED",
      entity: "User",
      entityId: user.id,
    });

    return { ok: true as const, backupCodes: backups };
  } catch {
    return {
      ok: false as const,
      error: "Session expired. Please sign in again.",
    };
  }
}

export async function getSecurityOverview() {
  try {
    const user = await requireUser();
    const [twoFactor, devices, logins, suspicious] = await Promise.all([
      prisma.twoFactorAuth.findUnique({ where: { userId: user.id } }),
      prisma.deviceSession.findMany({
        where: { userId: user.id, revokedAt: null },
        orderBy: { lastActiveAt: "desc" },
        take: 10,
      }),
      prisma.loginHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.suspiciousActivity.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      ok: true as const,
      twoFactorEnabled: Boolean(twoFactor?.enabled),
      backupCodesRemaining: twoFactor?.enabled
        ? twoFactor.backupCodes.length
        : 0,
      devices: devices.map((d) => ({
        id: d.id,
        deviceLabel: d.deviceLabel,
        userAgent: d.userAgent,
        ip: d.ip,
        lastActiveAt: d.lastActiveAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      })),
      logins: logins.map((l) => ({
        id: l.id,
        success: l.success,
        ip: l.ip,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
      })),
      suspicious: suspicious.map((s) => ({
        id: s.id,
        type: s.type,
        detail: s.detail,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  } catch {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }
}

export async function revokeDeviceSession(sessionId: string) {
  try {
    const user = await requireUser();
    await prisma.deviceSession.updateMany({
      where: { id: sessionId, userId: user.id },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      userId: user.id,
      action: "DEVICE_REVOKED",
      entity: "DeviceSession",
      entityId: sessionId,
    });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Session expired. Please sign in again.",
    };
  }
}

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(6).max(64),
});

export async function verifyTwoFactorLogin(input: {
  email: string;
  token: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const email = parsed.data.email.toLowerCase();
  const limit = await checkRateLimit({
    key: `auth:2fa:${email}`,
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) {
    return { ok: false as const, error: "RATE_LIMITED" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { twoFactor: true },
  });
  if (!user?.twoFactor?.enabled) {
    return { ok: false as const, error: "2FA not enabled." };
  }

  const verified = await verifyTwoFactorToken({
    userId: user.id,
    secret: user.twoFactor.secret,
    token: parsed.data.token,
  });

  await recordLoginAttempt({
    userId: user.id,
    success: verified.ok,
    ip: input.ip,
    userAgent: input.userAgent,
    reason: verified.ok
      ? verified.method === "backup"
        ? "2FA_BACKUP"
        : "2FA_TOTP"
      : "INVALID_2FA",
  });

  if (!verified.ok) return { ok: false as const, error: "Invalid code." };
  return { ok: true as const, userId: user.id };
}

export async function touchDeviceSession(input: {
  userId: string;
  token: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return upsertDeviceSession(input);
}
