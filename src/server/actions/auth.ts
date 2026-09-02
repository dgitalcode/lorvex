"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth";
import { getAuthStrings } from "@/i18n/auth-strings";
import { passwordSchema } from "@/lib/password-policy";
import { checkRateLimit, getClientIp } from "@/server/services/security";

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  password: passwordSchema,
  locale: z.enum(["fr", "en", "ar"]).default("fr"),
});

export type RegisterState = { success?: boolean; error?: string };

export async function registerUser(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your information.",
    };
  }

  const t = getAuthStrings(parsed.data.locale);
  const ip = await getClientIp();
  const emailLimit = await checkRateLimit({
    key: `auth:register:${parsed.data.email}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  const ipLimit = await checkRateLimit({
    key: `auth:register-ip:${ip}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return { error: t.rateLimited };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) return { error: "An account already exists for this email." };
  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      passwordChangedAt: new Date(),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      locale: parsed.data.locale,
    },
  });
  return { success: true };
}

export async function signOutUser(formData: FormData) {
  const localeRaw = String(formData.get("locale") ?? "fr");
  const locale = localeRaw === "en" || localeRaw === "ar" ? localeRaw : "fr";
  await signOut({ redirectTo: `/${locale}/auth/sign-in` });
}
