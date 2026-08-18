"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { buildPasswordResetEmail } from "@/lib/email/password-reset-template";
import type { Locale } from "@/config/site";
import { writeAuditLog } from "@/server/services/audit";
import {
  checkRateLimit,
  recordLoginAttempt,
} from "@/server/services/security";
import {
  burnPasswordResetLookupTime,
  consumePasswordReset,
  createPasswordResetToken,
  inspectPasswordResetToken,
  type ResetTokenStatus,
} from "@/server/services/password-reset";

const emailSchema = z.email().transform((v) => v.toLowerCase());

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

const GENERIC_OK = {
  ok: true as const,
  code: "GENERIC" as const,
};

export type ForgotPasswordState = {
  ok?: boolean;
  code?: "GENERIC" | "RATE_LIMITED" | "INVALID_EMAIL";
  error?: string;
};

export async function requestPasswordReset(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const localeRaw = String(formData.get("locale") ?? "fr");
  const locale: Locale =
    localeRaw === "en" || localeRaw === "ar" ? localeRaw : "fr";

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) {
    return { ok: false, code: "INVALID_EMAIL" };
  }

  const email = parsed.data;
  const ip = await clientIp();

  const emailLimit = await checkRateLimit({
    key: `auth:forgot:${email}`,
    limit: 3,
    windowMs: 15 * 60_000,
  });
  const ipLimit = await checkRateLimit({
    key: `auth:forgot-ip:${ip}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return { ok: false, code: "RATE_LIMITED" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      status: true,
      locale: true,
    },
  });

  if (!user?.passwordHash || user.status !== "ACTIVE") {
    await burnPasswordResetLookupTime();
    return GENERIC_OK;
  }

  const { rawToken } = await createPasswordResetToken(user.id);
  const mail = buildPasswordResetEmail({
    locale: (user.locale as Locale) || locale,
    token: rawToken,
  });

  await sendTransactionalEmail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    template: "password_reset",
    idempotencyKey: `password-reset/${user.id}/${rawToken}`,
    meta: { userId: user.id, locale },
  });

  await writeAuditLog({
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    entity: "User",
    entityId: user.id,
    ip,
  });

  return GENERIC_OK;
}

export async function getPasswordResetTokenStatus(
  token: string,
): Promise<{ status: ResetTokenStatus }> {
  const ip = await clientIp();
  const limit = await checkRateLimit({
    key: `auth:reset-inspect:${ip}`,
    limit: 30,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return { status: "invalid" };

  const inspected = await inspectPasswordResetToken(token);
  return { status: inspected.status };
}

export type ResetPasswordState = {
  ok?: boolean;
  code?:
    | "SUCCESS"
    | "RATE_LIMITED"
    | "INVALID_TOKEN"
    | "EXPIRED_TOKEN"
    | "USED_TOKEN"
    | "PASSWORD_MISMATCH"
    | "WEAK_PASSWORD"
    | "SAME_PASSWORD";
};

export async function resetPasswordWithToken(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const ip = await clientIp();
  const limit = await checkRateLimit({
    key: `auth:reset:${ip}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return { ok: false, code: "RATE_LIMITED" };

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const tokenLimit = await checkRateLimit({
    key: `auth:reset-token:${hashTokenPrefix(token)}`,
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!tokenLimit.allowed) return { ok: false, code: "RATE_LIMITED" };

  const result = await consumePasswordReset({
    rawToken: token,
    password,
    confirmPassword,
  });

  if (!result.ok) {
    return { ok: false, code: result.error };
  }

  await writeAuditLog({
    userId: result.userId,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "User",
    entityId: result.userId,
    ip,
  });

  await recordLoginAttempt({
    userId: result.userId,
    success: true,
    ip,
    reason: "PASSWORD_RESET",
  });

  const notifyCopy = {
    fr: {
      title: "Mot de passe modifié",
      body: "Le mot de passe de votre compte LORVEX a été modifié avec succès.",
    },
    en: {
      title: "Password changed",
      body: "Your LORVEX account password was changed successfully.",
    },
    ar: {
      title: "تم تغيير كلمة المرور",
      body: "تم تغيير كلمة مرور حساب LORVEX بنجاح.",
    },
  };

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { locale: true },
  });
  const locale =
    user?.locale === "en" || user?.locale === "ar" ? user.locale : "fr";
  const n = notifyCopy[locale];

  await prisma.notification.create({
    data: {
      userId: result.userId,
      title: n.title,
      body: n.body,
      href: `/${locale}/account/security`,
    },
  });

  return { ok: true, code: "SUCCESS" };
}

function hashTokenPrefix(token: string) {
  return createHash("sha256")
    .update(token.slice(0, 16) || "empty")
    .digest("hex")
    .slice(0, 16);
}
