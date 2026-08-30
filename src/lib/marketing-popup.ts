import type { Locale } from "@/config/site";
import { PRODUCTION_SITE_ORIGIN } from "@/config/site";

export const POPUP_TRIGGERS = [
  "IMMEDIATE",
  "DELAY",
  "SCROLL",
  "EXIT_INTENT",
] as const;
export type PopupTrigger = (typeof POPUP_TRIGGERS)[number];

export const POPUP_PAGE_TARGETS = [
  "ALL",
  "HOME",
  "SHOP",
  "COLLECTION",
  "PRODUCT",
  "OTHER",
] as const;
export type PopupPageTarget = (typeof POPUP_PAGE_TARGETS)[number];

export const POPUP_DEVICES = ["ALL", "DESKTOP", "MOBILE"] as const;
export type PopupDevice = (typeof POPUP_DEVICES)[number];

export const POPUP_AUDIENCES = ["ALL", "GUESTS", "AUTHENTICATED"] as const;
export type PopupAudience = (typeof POPUP_AUDIENCES)[number];

export const POPUP_FREQUENCIES = [
  "EVERY_VISIT",
  "ONCE_PER_SESSION",
  "ONCE_PER_DAY",
] as const;
export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number];

export const POPUP_LOCALE_TARGETS = ["all", "fr", "en", "ar"] as const;
export type PopupLocaleTarget = (typeof POPUP_LOCALE_TARGETS)[number];

export type PopupLocaleCopy = {
  title: string;
  body: string;
  ctaLabel?: string | null;
};

export type PopupContent = {
  fr?: PopupLocaleCopy;
  en?: PopupLocaleCopy;
  ar?: PopupLocaleCopy;
  ctaUrl?: string | null;
  /** Legacy single-language payload */
  title?: string;
  body?: string;
  ctaLabel?: string | null;
};

export type PopupCampaignRecord = {
  id: string;
  name: string;
  content: PopupContent;
  trigger: PopupTrigger;
  delaySeconds: number | null;
  scrollPercent: number | null;
  pageTargets: PopupPageTarget[];
  localeTarget: PopupLocaleTarget;
  deviceTarget: PopupDevice;
  audience: PopupAudience;
  frequency: PopupFrequency;
  priority: number;
  imageUrl: string | null;
  isActive: boolean;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

export type PopupPageKind = PopupPageTarget | "BLOCKED";

export type PopupEligiblePayload = {
  id: string;
  trigger: PopupTrigger;
  delaySeconds: number | null;
  scrollPercent: number | null;
  frequency: PopupFrequency;
  priority: number;
  imageUrl: string | null;
  ctaUrl: string | null;
  title: string;
  body: string;
  ctaLabel: string | null;
  locale: Locale;
};

const BLOCKED_SEGMENTS = new Set([
  "admin",
  "auth",
  "account",
  "checkout",
  "cart",
  "order",
]);

export function popupStorageKey(campaignId: string) {
  return `lorvex_popup_${campaignId}`;
}

export function classifyStorefrontPath(pathname: string): PopupPageKind {
  const clean = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const parts = clean.split("/").filter(Boolean);
  const rest = parts[0] && ["fr", "en", "ar"].includes(parts[0]) ? parts.slice(1) : parts;
  const first = rest[0] ?? "";

  if (!first) return "HOME";
  if (BLOCKED_SEGMENTS.has(first)) return "BLOCKED";
  if (first === "shop") return "SHOP";
  if (first === "collections" || first === "collection") return "COLLECTION";
  if (first === "product" || first === "products") return "PRODUCT";
  return "OTHER";
}

export function pathMatchesTargets(
  pathname: string,
  targets: PopupPageTarget[] | null | undefined,
): boolean {
  const kind = classifyStorefrontPath(pathname);
  if (kind === "BLOCKED") return false;
  const list = targets?.length ? targets : (["ALL"] as PopupPageTarget[]);
  if (list.includes("ALL")) return true;
  return list.includes(kind);
}

export function classifyDevice(width: number): Exclude<PopupDevice, "ALL"> {
  return width < 768 ? "MOBILE" : "DESKTOP";
}

export function deviceMatches(target: PopupDevice, actual: PopupDevice): boolean {
  if (target === "ALL") return true;
  if (actual === "ALL") return true;
  return target === actual;
}

export function audienceMatches(
  target: PopupAudience,
  authenticated: boolean,
): boolean {
  if (target === "ALL") return true;
  if (target === "AUTHENTICATED") return authenticated;
  return !authenticated;
}

export function localeMatches(target: PopupLocaleTarget, locale: Locale): boolean {
  if (target === "all") return true;
  return target === locale;
}

export function scheduleIsActive(
  now: Date,
  startsAt: Date | string | null | undefined,
  endsAt: Date | string | null | undefined,
): boolean {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function localeBlockCtaUrl(copy: PopupLocaleCopy | undefined): string | null {
  if (!copy || typeof copy !== "object") return null;
  if (!("ctaUrl" in copy)) return null;
  return sanitizePopupCtaUrl((copy as PopupLocaleCopy & { ctaUrl?: string | null }).ctaUrl);
}

function copyForLocale(content: PopupContent, locale: Locale): PopupLocaleCopy | null {
  const localized = content[locale];
  if (localized?.title?.trim() && localized.body?.trim()) {
    return {
      title: localized.title.trim(),
      body: localized.body.trim(),
      ctaLabel: localized.ctaLabel?.trim() || content.ctaLabel?.trim() || null,
    };
  }
  if (content.title?.trim() && content.body?.trim()) {
    return {
      title: content.title.trim(),
      body: content.body.trim(),
      ctaLabel: content.ctaLabel?.trim() || null,
    };
  }
  return null;
}

export function visiblePopupCta(
  label: string | null | undefined,
  url: string | null | undefined,
): { label: string; href: string } | null {
  const text = label?.trim() || null;
  const href = sanitizePopupCtaUrl(url);
  if (!text || !href) return null;
  return { label: text, href };
}

export function resolvePopupCopy(
  content: PopupContent,
  locale: Locale,
): (PopupLocaleCopy & { ctaUrl: string | null }) | null {
  const copy = copyForLocale(content, locale);
  if (!copy) return null;
  const href =
    sanitizePopupCtaUrl(content.ctaUrl) ??
    localeBlockCtaUrl(content[locale]) ??
    sanitizePopupCtaUrl(copy.ctaLabel);
  return { ...copy, ctaUrl: href };
}

const UNSAFE_SCHEME = /^(javascript|data|vbscript|file|blob):/i;

export function sanitizePopupCtaUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (UNSAFE_SCHEME.test(trimmed)) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/")) {
    if (trimmed.includes("\\") || trimmed.includes("\0")) return null;
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.protocol === "http:" && url.hostname !== "localhost") {
      if (
        url.hostname === "lorvex.ma" ||
        url.hostname === "www.lorvex.ma"
      ) {
        url.protocol = "https:";
        if (url.hostname === "lorvex.ma") url.hostname = "www.lorvex.ma";
        return url.toString();
      }
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isInternalPopupHref(href: string): boolean {
  if (href.startsWith("/")) return true;
  try {
    const url = new URL(href);
    return (
      url.origin === PRODUCTION_SITE_ORIGIN ||
      url.hostname === "www.lorvex.ma" ||
      url.hostname === "localhost"
    );
  } catch {
    return false;
  }
}

export function parsePageTargets(value: unknown): PopupPageTarget[] {
  if (!Array.isArray(value) || value.length === 0) return ["ALL"];
  const next = value.filter((item): item is PopupPageTarget =>
    POPUP_PAGE_TARGETS.includes(item as PopupPageTarget),
  );
  return next.length ? next : ["ALL"];
}

export function normalizePriority(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(1, Math.round(n)));
}

export function normalizeDelaySeconds(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(120, Math.max(1, Math.round(n)));
}

export function normalizeScrollPercent(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(95, Math.max(10, Math.round(n)));
}

export function campaignIsEligible(input: {
  campaign: PopupCampaignRecord;
  now: Date;
  locale: Locale;
  pathname: string;
  device: PopupDevice;
  authenticated: boolean;
}): PopupEligiblePayload | null {
  const { campaign, now, locale, pathname, device, authenticated } = input;
  if (!campaign.isActive) return null;
  if (!scheduleIsActive(now, campaign.startsAt, campaign.endsAt)) return null;
  if (!localeMatches(campaign.localeTarget, locale)) return null;
  if (!pathMatchesTargets(pathname, campaign.pageTargets)) return null;
  if (!deviceMatches(campaign.deviceTarget, device)) return null;
  if (!audienceMatches(campaign.audience, authenticated)) return null;
  const copy = resolvePopupCopy(campaign.content, locale);
  if (!copy) return null;

  return {
    id: campaign.id,
    trigger: campaign.trigger,
    delaySeconds: campaign.delaySeconds,
    scrollPercent: campaign.scrollPercent,
    frequency: campaign.frequency,
    priority: campaign.priority,
    imageUrl: campaign.imageUrl,
    ctaUrl: copy.ctaUrl,
    title: copy.title,
    body: copy.body,
    ctaLabel: copy.ctaLabel ?? null,
    locale,
  };
}

export function pickHighestPriority(
  payloads: PopupEligiblePayload[],
): PopupEligiblePayload | null {
  if (!payloads.length) return null;
  return [...payloads].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  })[0]!;
}

export function isFrequencyConsumed(
  frequency: PopupFrequency,
  storedAt: number | null,
  now = Date.now(),
): boolean {
  if (storedAt == null) return false;
  if (frequency === "EVERY_VISIT") return false;
  if (frequency === "ONCE_PER_SESSION") return true;
  const dayMs = 24 * 60 * 60 * 1000;
  return now - storedAt < dayMs;
}

export function resolveClientTrigger(
  trigger: PopupTrigger,
  device: Exclude<PopupDevice, "ALL">,
): PopupTrigger {
  if (trigger === "EXIT_INTENT" && device === "MOBILE") return "DELAY";
  return trigger;
}

export function effectiveDelayMs(
  trigger: PopupTrigger,
  delaySeconds: number | null,
): number {
  if (trigger === "IMMEDIATE") return 0;
  if (trigger === "DELAY" || trigger === "EXIT_INTENT") {
    return (delaySeconds ?? 8) * 1000;
  }
  return 0;
}
