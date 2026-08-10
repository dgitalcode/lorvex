import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "LORVEX <noreply@lorvex.ma>";

export function isEmailConfigured() {
  return Boolean(apiKey);
}

export function getEmailConfigStatus() {
  return {
    configured: isEmailConfigured(),
    from,
    missing: !apiKey ? (["RESEND_API_KEY"] as string[]) : [],
  };
}

function getClient() {
  if (!apiKey) throw new Error("Resend is not configured");
  return new Resend(apiKey);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  template?: string;
  meta?: Record<string, unknown>;
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
    const client = getClient();
    const result = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        template: input.template,
        status: result.error ? "FAILED" : "SENT",
        meta: { ...input.meta, id: result.data?.id, error: result.error },
      },
    });
    if (result.error) return { ok: false as const, reason: "FAILED" as const };
    return { ok: true as const, id: result.data?.id };
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        template: input.template,
        status: "FAILED",
        meta: {
          ...input.meta,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });
    return { ok: false as const, reason: "FAILED" as const };
  }
}
