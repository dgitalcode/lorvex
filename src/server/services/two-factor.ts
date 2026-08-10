import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { verifySync } from "otplib";
import { prisma } from "@/lib/prisma";

/**
 * Normalize user/input backup codes so generation and verification stay aligned.
 * Strips whitespace, zero-width chars, and all common dash glyphs; lowercases.
 */
export function normalizeBackupCode(code: string) {
  return code
    .normalize("NFKC")
    .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/[\-‐‑‒–—―−﹘﹣－]/g, "")
    .toLowerCase();
}

export function hashBackupCode(code: string) {
  return createHash("sha256")
    .update(normalizeBackupCode(code))
    .digest("hex");
}

/** Cryptographically secure, human-readable: `XXXX-XXXX` (8 hex chars). */
export function generateBackupCode() {
  const raw = randomBytes(4).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => generateBackupCode());
}

function hashesEqual(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * TOTP-only check. Never throws — otplib rejects non-6-digit tokens with
 * exceptions, which previously short-circuited backup-code verification.
 */
export function verifyTotpCode(token: string, secret: string): boolean {
  const digits = token.replace(/[\s\u00A0]/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  try {
    const result = verifySync({ token: digits, secret });
    return Boolean(result.valid);
  } catch {
    return false;
  }
}

/** Index of matching hashed backup code, or -1. */
export function findBackupCodeIndex(
  hashedCodes: string[],
  token: string,
): number {
  const hash = hashBackupCode(token);
  return hashedCodes.findIndex((stored) => hashesEqual(stored, hash));
}

/**
 * Pure match helper for tests / in-memory stores.
 * Does not mutate; caller removes the code after success.
 */
export function matchBackupCode(
  hashedCodes: string[],
  token: string,
): { ok: true; index: number; remaining: string[] } | { ok: false } {
  const index = findBackupCodeIndex(hashedCodes, token);
  if (index === -1) return { ok: false };
  return {
    ok: true,
    index,
    remaining: hashedCodes.filter((_, i) => i !== index),
  };
}

/**
 * Verify TOTP or a single-use backup code.
 * On backup success, the matching hash is removed immediately.
 * Never returns or logs plaintext codes.
 */
export async function verifyTwoFactorToken(input: {
  userId: string;
  secret: string;
  /** Optional snapshot; DB is always re-read before consume. */
  backupCodes?: string[];
  token: string;
}): Promise<{ ok: true; method: "totp" | "backup" } | { ok: false }> {
  const token = input.token.trim();
  if (!token) return { ok: false };

  if (verifyTotpCode(token, input.secret)) {
    return { ok: true, method: "totp" };
  }

  // Only attempt backup verify for codes that look like backup material
  // (not raw 6-digit TOTP). Still accept hyphenated / spaced variants.
  const normalized = normalizeBackupCode(token);
  if (!/^[0-9a-f]{8}$/.test(normalized)) {
    return { ok: false };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.twoFactorAuth.findUnique({
        where: { userId: input.userId },
      });
      if (!row?.enabled) return { ok: false as const };

      const matched = matchBackupCode(row.backupCodes, token);
      if (!matched.ok) return { ok: false as const };

      await tx.twoFactorAuth.update({
        where: { userId: input.userId },
        data: { backupCodes: matched.remaining },
      });

      return { ok: true as const, method: "backup" as const };
    });
  } catch {
    return { ok: false };
  }
}
