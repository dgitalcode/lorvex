"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { siteConfig, type Locale } from "@/config/site";

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(siteConfig.locales).default("fr"),
});

export async function subscribeNewsletter(input: {
  email: string;
  locale: Locale;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Email invalide" };
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    create: {
      email: parsed.data.email.toLowerCase(),
      locale: parsed.data.locale,
      isActive: true,
    },
    update: {
      isActive: true,
      locale: parsed.data.locale,
    },
  });

  return { ok: true };
}
