import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyticsEventSchema } from "@/server/validations/analytics";
import {
  checkRateLimit,
  ipFromRequest,
  rateLimitRetryAfterHeader,
} from "@/server/services/security";

export async function POST(request: Request) {
  const limited = await checkRateLimit({
    key: `analytics:${ipFromRequest(request)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitRetryAfterHeader(limited) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = analyticsEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { name, path, referrer, sessionId, entityType, entityId, meta } =
    parsed.data;

  await prisma.analyticsEvent.create({
    data: {
      name,
      path: path ?? null,
      referrer: referrer ?? null,
      sessionId: sessionId ?? null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
