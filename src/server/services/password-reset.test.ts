import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { passwordSchema, passwordStrength } from "@/lib/password-policy";
import {
  burnPasswordResetLookupTime,
  consumePasswordReset,
  createPasswordResetToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
  inspectPasswordResetToken,
  invalidateActiveResetTokens,
} from "@/server/services/password-reset";

describe("password policy", () => {
  it("rejects weak passwords", () => {
    assert.equal(passwordSchema.safeParse("short").success, false);
    assert.equal(passwordSchema.safeParse("nouppercase1").success, false);
    assert.equal(passwordSchema.safeParse("NoNumberHere").success, false);
  });

  it("accepts policy-compliant passwords", () => {
    assert.equal(passwordSchema.safeParse("SecurePass1").success, true);
  });

  it("scores strength", () => {
    assert.ok(passwordStrength("a").score <= 1);
    assert.ok(passwordStrength("SecurePass1!").score >= 3);
  });
});

describe("password reset tokens (pure)", () => {
  it("hashes tokens without storing plaintext equality", () => {
    const raw = generatePasswordResetToken();
    assert.ok(raw.length >= 32);
    const a = hashPasswordResetToken(raw);
    const b = hashPasswordResetToken(` ${raw} `);
    assert.equal(a, b);
    assert.notEqual(a, raw);
  });
});

describe("password reset lifecycle", () => {
  let userId = "";
  let email = "";
  const oldPassword = "OldPassword1";
  const newPassword = "NewPassword2";

  before(async () => {
    email = `reset-test-${Date.now()}@lorvex.test`;
    const passwordHash = await hash(oldPassword, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        passwordChangedAt: new Date(Date.now() - 60_000),
        firstName: "Reset",
        lastName: "Test",
        name: "Reset Test",
        locale: "en",
        twoFactor: {
          create: {
            secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
            enabled: true,
            backupCodes: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
          },
        },
      },
      include: { twoFactor: true },
    });
    userId = user.id;
    assert.equal(user.twoFactor?.enabled, true);
    assert.equal(user.twoFactor?.backupCodes.length, 1);
  });

  after(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it("unknown email path burns time without throwing", async () => {
    await burnPasswordResetLookupTime();
  });

  it("creates a valid token and invalidates previous ones", async () => {
    const first = await createPasswordResetToken(userId);
    const second = await createPasswordResetToken(userId);
    const firstStatus = await inspectPasswordResetToken(first.rawToken);
    const secondStatus = await inspectPasswordResetToken(second.rawToken);
    assert.equal(firstStatus.status, "used");
    assert.equal(secondStatus.status, "valid");
  });

  it("rejects invalid / weak / mismatch passwords", async () => {
    const { rawToken } = await createPasswordResetToken(userId);
    assert.equal(
      (await consumePasswordReset({
        rawToken,
        password: "NewPassword2",
        confirmPassword: "OtherPass1",
      })).ok,
      false,
    );
    assert.equal(
      (await consumePasswordReset({
        rawToken,
        password: "weak",
        confirmPassword: "weak",
      })).ok,
      false,
    );
    // Token still valid after failed attempts
    assert.equal((await inspectPasswordResetToken(rawToken)).status, "valid");
  });

  it("rejects same-as-old password", async () => {
    const { rawToken } = await createPasswordResetToken(userId);
    const result = await consumePasswordReset({
      rawToken,
      password: oldPassword,
      confirmPassword: oldPassword,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "SAME_PASSWORD");
  });

  it("successfully resets password, consumes token, preserves 2FA", async () => {
    const { rawToken } = await createPasswordResetToken(userId);
    const result = await consumePasswordReset({
      rawToken,
      password: newPassword,
      confirmPassword: newPassword,
    });
    assert.equal(result.ok, true);

    const replay = await consumePasswordReset({
      rawToken,
      password: "AnotherPass3",
      confirmPassword: "AnotherPass3",
    });
    assert.equal(replay.ok, false);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactor: true },
    });
    assert.ok(user?.passwordHash);
    assert.equal(await compare(oldPassword, user!.passwordHash!), false);
    assert.equal(await compare(newPassword, user!.passwordHash!), true);
    assert.equal(user?.twoFactor?.enabled, true);
    assert.equal(user?.twoFactor?.backupCodes.length, 1);
    assert.ok(user?.passwordChangedAt);
  });

  it("rejects expired tokens", async () => {
    const { rawToken } = await createPasswordResetToken(userId);
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal((await inspectPasswordResetToken(rawToken)).status, "expired");
    const result = await consumePasswordReset({
      rawToken,
      password: "FreshPass9",
      confirmPassword: "FreshPass9",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "EXPIRED_TOKEN");
  });

  it("invalidateActiveResetTokens marks unused tokens used", async () => {
    const { rawToken } = await createPasswordResetToken(userId);
    await invalidateActiveResetTokens(userId);
    assert.equal((await inspectPasswordResetToken(rawToken)).status, "used");
  });
});
