import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { smartSearch, getCachedTrendingSearches } from "@/server/services/search";
import { checkRateLimit } from "@/server/services/security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const locale = searchParams.get("locale") ?? "fr";
  const sessionId = searchParams.get("sessionId");
  const mode = (searchParams.get("mode") as "text" | "barcode" | "qr" | null) ?? "text";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const limit = await checkRateLimit({
    key: `search:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", results: [] },
      { status: 429 },
    );
  }

  if (q.length < 1) {
    const session = await auth().catch(() => null);
    const [trending, recent] = await Promise.all([
      getCachedTrendingSearches().catch(() => []),
      sessionId || session?.user?.id
        ? (await import("@/server/services/search")).getRecentSearches({
            sessionId,
            userId: session?.user?.id ?? null,
            limit: 6,
          })
        : Promise.resolve([] as string[]),
    ]);
    return NextResponse.json({ results: [], trending, recent });
  }

  try {
    const session = await auth().catch(() => null);
    const data = await smartSearch({
      q,
      locale,
      limit: 8,
      sessionId,
      userId: session?.user?.id ?? null,
      source: "overlay",
      mode: mode === "barcode" || mode === "qr" ? mode : "text",
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=10" },
    });
  } catch {
    return NextResponse.json({ results: [], trending: [], recent: [] });
  }
}
