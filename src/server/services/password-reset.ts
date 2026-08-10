import { createHash, randomBytes } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/password-policy";
import { hashToken } from "@/server/services/security";

export const PASSWORD_RESET_TTL_MS = 45 * 60_000;

export function generatePasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(rawToken: string) {
  return hashToken(rawToken.trim());
}

export type ResetTokenStatus = "valid" | "invalid" | "expired" | "used";

export async function inspectPasswordResetToken(
  rawToken: string,
): Promise<{ status: ResetTokenStatus; userId?: string; tokenId?: string }> {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) {
    return { status: "invalid" };
  }

  const tokenHash = hashPasswordResetToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!row) return { status: "invalid" };
  if (row.usedAt) return { status: "used", userId: row.userId, tokenId: row.id };
  if (row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired", userId: row.userId, tokenId: row.id };
  }
  return { status: "valid", userId: row.userId, tokenId: row.id };
}

export async function invalidateActiveResetTokens(userId: string) {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export async function createPasswordResetToken(userId: string) {
  await invalidateActiveResetTokens(userId);
  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { rawToken, expiresAt };
}

/**
 * Apply a new password using a valid reset token.
 * Preserves 2FA / backup codes. Invalidates reset token + device sessions.
 */
export async function consumePasswordReset(input: {
  rawToken: string;
  password: string;
  confirmPassword: string;
}): Promise<
  | { ok: true; userId: string }
  | {
      ok: false;
      error:
        | "INVALID_TOKEN"
        | "EXPIRED_TOKEN"
        | "USED_TOKEN"
        | "PASSWORD_MISMATCH"
        | "WEAK_PASSWORD"
        | "SAME_PASSWORD";
    }
> {
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "PASSWORD_MISMATCH" };
  }

  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) {
    return { ok: false, error: "WEAK_PASSWORD" };
  }

  const inspected = await inspectPasswordResetToken(input.rawToken);
  if (inspected.status === "invalid") return { ok: false, error: "INVALID_TOKEN" };
  if (inspected.status === "expired") return { ok: false, error: "EXPIRED_TOKEN" };
  if (inspected.status === "used") return { ok: false, error: "USED_TOKEN" };
  if (!inspected.userId || !inspected.tokenId) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const user = await prisma.user.findUnique({
    where: { id: inspected.userId },
    select: { id: true, passwordHash: true, status: true },
  });
  if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const same = await compare(parsed.data, user.passwordHash);
  if (same) return { ok: false, error: "SAME_PASSWORD" };

  const passwordHash = await hash(parsed.data, 12);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: inspected.tokenId,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new Error("TOKEN_RACE");
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      });

      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });

      await tx.deviceSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.session.deleteMany({ where: { userId: user.id } });
    });
  } catch {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  return { ok: true, userId: user.id };
}

/** Dummy work to reduce timing oracle on unknown emails. */
export async function burnPasswordResetLookupTime() {
  createHash("sha256").update(randomBytes(32)).digest("hex");
  await hash(randomBytes(16).toString("hex"), 10);
}
