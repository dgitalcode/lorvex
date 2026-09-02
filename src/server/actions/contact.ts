"use server";

import { z } from "zod";
import { siteConfig, type Locale } from "@/config/site";
import { storefrontCopy } from "@/content/storefront-copy";
import { sendTransactionalEmail } from "@/lib/email";
import { buildContactEnquiryEmail } from "@/lib/email/contact-enquiry-template";
import { getStorefrontSettings } from "@/server/repositories/settings";
import { checkRateLimit, getClientIp } from "@/server/services/security";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(siteConfig.locales).default("fr"),
  company: z.string().max(80).optional(),
});

export type ContactFormState = {
  ok?: boolean;
  error?: string;
};

function copyFor(locale: Locale) {
  return storefrontCopy(locale);
}

export async function submitContactEnquiry(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    locale: formData.get("locale"),
    company: formData.get("company") ?? "",
  });
  const localeRaw = String(formData.get("locale") ?? "fr");
  const locale: Locale =
    localeRaw === "en" || localeRaw === "ar" ? localeRaw : "fr";
  const copy = copyFor(locale);

  if (!parsed.success) {
    return { error: copy.contactInvalid };
  }

  if (parsed.data.company?.trim()) {
    return { ok: true };
  }

  const ip = await getClientIp();
  const emailLimit = await checkRateLimit({
    key: `contact:email:${parsed.data.email}`,
    limit: 3,
    windowMs: 15 * 60_000,
  });
  const ipLimit = await checkRateLimit({
    key: `contact:ip:${ip}`,
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return { error: copy.contactRateLimited };
  }

  const settings = await getStorefrontSettings();
  const email = buildContactEnquiryEmail(parsed.data);
  const result = await sendTransactionalEmail({
    to: settings.supportEmail,
    subject: email.subject,
    html: email.html,
    replyTo: parsed.data.email,
    template: "contact-enquiry",
    meta: { locale: parsed.data.locale },
  });

  if (!result.ok) {
    return { error: copy.contactSendError };
  }
  return { ok: true };
}
