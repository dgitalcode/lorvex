import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/config/site";
import {
  campaignIsEligible,
  parsePageTargets,
  type PopupAudience,
  type PopupCampaignRecord,
  type PopupContent,
  type PopupDevice,
  type PopupEligiblePayload,
  type PopupFrequency,
  type PopupLocaleTarget,
  type PopupTrigger,
} from "@/lib/marketing-popup";

const TRIGGERS = new Set(["IMMEDIATE", "DELAY", "SCROLL", "EXIT_INTENT"]);

function asTrigger(value: string): PopupTrigger {
  return TRIGGERS.has(value) ? (value as PopupTrigger) : "DELAY";
}

function asRecord(row: {
  id: string;
  name: string;
  content: Prisma.JsonValue;
  trigger: string;
  delaySeconds: number | null;
  scrollPercent: number | null;
  pageTargets: Prisma.JsonValue;
  localeTarget: string;
  deviceTarget: string;
  audience: string;
  frequency: string;
  priority: number;
  imageUrl: string | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): PopupCampaignRecord {
  return {
    id: row.id,
    name: row.name,
    content: (row.content ?? {}) as PopupContent,
    trigger: asTrigger(row.trigger),
    delaySeconds: row.delaySeconds,
    scrollPercent: row.scrollPercent,
    pageTargets: parsePageTargets(row.pageTargets),
    localeTarget: (row.localeTarget as PopupLocaleTarget) || "all",
    deviceTarget: (row.deviceTarget as PopupDevice) || "ALL",
    audience: (row.audience as PopupAudience) || "ALL",
    frequency: (row.frequency as PopupFrequency) || "ONCE_PER_SESSION",
    priority: row.priority,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

export async function listEligiblePopups(input: {
  locale: Locale;
  pathname: string;
  device: PopupDevice;
  authenticated: boolean;
  now?: Date;
}): Promise<PopupEligiblePayload[]> {
  const now = input.now ?? new Date();
  const rows = await prisma.popupCampaign.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 40,
  });

  const eligible: PopupEligiblePayload[] = [];
  for (const row of rows) {
    const payload = campaignIsEligible({
      campaign: asRecord(row),
      now,
      locale: input.locale,
      pathname: input.pathname,
      device: input.device,
      authenticated: input.authenticated,
    });
    if (payload) eligible.push(payload);
  }
  return eligible;
}

export async function getPopupCampaignStats(campaignIds: string[]) {
  if (!campaignIds.length) {
    return new Map<string, { impressions: number; clicks: number; dismissals: number }>();
  }

  const grouped = await prisma.analyticsEvent.groupBy({
    by: ["name", "entityId"],
    where: {
      entityType: "popup",
      entityId: { in: campaignIds },
      name: { in: ["popup_impression", "popup_click", "popup_dismiss"] },
    },
    _count: { _all: true },
  });

  const stats = new Map<
    string,
    { impressions: number; clicks: number; dismissals: number }
  >();
  for (const id of campaignIds) {
    stats.set(id, { impressions: 0, clicks: 0, dismissals: 0 });
  }
  for (const row of grouped) {
    if (!row.entityId) continue;
    const current = stats.get(row.entityId) ?? {
      impressions: 0,
      clicks: 0,
      dismissals: 0,
    };
    if (row.name === "popup_impression") current.impressions = row._count._all;
    if (row.name === "popup_click") current.clicks = row._count._all;
    if (row.name === "popup_dismiss") current.dismissals = row._count._all;
    stats.set(row.entityId, current);
  }
  return stats;
}
