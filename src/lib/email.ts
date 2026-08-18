import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

const apiKey = env("RESEND_API_KEY");
const from = env("EMAIL_FROM") || "LORVEX <noreply@lorvex.ma>";

export function isEmailConfigured() {
  return Boolean(apiKey);
}

export function getEmailConfigStatus() {
  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  return {
    configured: missing.length === 0,
    from,
    missing,
  };
}

function getClient() {
  return new Resend(apiKey);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  /** Logging category only — never sent as a Resend template id. */
  template?: string;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  if (!isEmailConfigured()) {
    await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        template: input.template,
        status: "NOT_CONFIGURED",
        meta: { ...input.meta, reason: "RESEND_API_KEY missing" },
      },
    });
    return { ok: false as const, reason: "NOT_CONFIGURED" as const };
  }

  try {
    const { data, error } = await getClient().emails.send(
      {
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        replyTo: siteConfig.supportEmail,
        tags: input.template
          ? [{ name: "category", value: input.template.slice(0, 256) }]
          : undefined,
      },
      input.idempotencyKey
        ? { idempotencyKey: input.idempotencyKey.slice(0, 256) }
        : undefined,
    );

    await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        template: input.template,
        status: error ? "FAILED" : "SENT",
        meta: {
          ...input.meta,
          id: data?.id,
          error: error
            ? { name: error.name, message: error.message }
            : undefined,
        },
      },
    });

    if (error) return { ok: false as const, reason: "FAILED" as const };
    return { ok: true as const, id: data?.id };
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        template: input.template,
        status: "FAILED",
        meta: {
          ...input.meta,
          error: error instanceof Error ? error.message : "Network error",
        },
      },
    });
    return { ok: false as const, reason: "FAILED" as const };
  }
}
