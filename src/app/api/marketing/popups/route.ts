import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isLocale } from "@/i18n/get-dictionary";
import { checkRateLimit } from "@/server/services/security";
import { listEligiblePopups } from "@/server/repositories/marketing-popups";
import {
  classifyDevice,
  parseSeenCampaignIds,
  selectEligibleWinner,
  type PopupDevice,
} from "@/lib/marketing-popup";

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit({
    key: `popup-eligible:${ip}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ campaign: null }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale") ?? "fr";
  if (!isLocale(localeParam)) {
    return NextResponse.json({ campaign: null }, { status: 400 });
  }
  const pathname = searchParams.get("path") ?? `/${localeParam}`;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return NextResponse.json({ campaign: null }, { status: 400 });
  }

  const width = Number(searchParams.get("w") ?? "1024");
  const device: PopupDevice = classifyDevice(Number.isFinite(width) ? width : 1024);

  const session = await auth().catch(() => null);
  const authenticated = Boolean(session?.user?.id);

  const excludeIds = parseSeenCampaignIds(searchParams.get("seen"));

  const eligible = await listEligiblePopups({
    locale: localeParam,
    pathname,
    device,
    authenticated,
    excludeIds,
  });
  const campaign = selectEligibleWinner(eligible, excludeIds);

  return NextResponse.json(
    { campaign },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
