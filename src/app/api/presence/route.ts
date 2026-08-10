import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PresenceStore = Map<string, Map<string, number>>;

const globalPresence = globalThis as unknown as {
  lorvexPresence: PresenceStore | undefined;
};

const presence: PresenceStore =
  globalPresence.lorvexPresence ?? new Map();
globalPresence.lorvexPresence = presence;

const WINDOW_MS = 90_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const sessionId = searchParams.get("sessionId");
  if (!productId || !sessionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const now = Date.now();
  const sessions = presence.get(productId) ?? new Map<string, number>();
  sessions.set(sessionId, now);
  for (const [id, seenAt] of sessions) {
    if (now - seenAt > WINDOW_MS) sessions.delete(id);
  }
  presence.set(productId, sessions);

  return NextResponse.json(
    { viewers: sessions.size },
    { headers: { "Cache-Control": "no-store" } },
  );
}
