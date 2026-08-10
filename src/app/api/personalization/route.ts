import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getPersonalizedHomepage,
  upsertPersonalizationFromBehavior,
} from "@/server/services/recommendations";
import { checkRateLimit } from "@/server/services/security";

const bodySchema = z.object({
  sessionId: z.string().min(8).max(80).optional(),
  recentProductIds: z.array(z.string().min(1)).max(24).optional(),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = await checkRateLimit({
    key: `personalize:${ip}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    const sessionId = parsed.data.sessionId ?? null;

    if (parsed.data.recentProductIds?.length) {
      await upsertPersonalizationFromBehavior({
        userId,
        sessionId,
        viewedProductIds: parsed.data.recentProductIds,
      });
    }

    const homepage = await getPersonalizedHomepage({
      userId,
      sessionId,
      recentProductIds: parsed.data.recentProductIds,
    });

    return NextResponse.json(homepage, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch {
    return NextResponse.json(
      {
        isReturning: false,
        continueShopping: [],
        forYou: [],
        favoriteBrandProducts: [],
        recommendedCollections: [],
      },
      { status: 200 },
    );
  }
}
