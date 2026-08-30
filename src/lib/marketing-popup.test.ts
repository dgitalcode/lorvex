import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import { getDirection } from "@/i18n/get-dictionary";
import { roleHasPermission } from "@/server/auth/permissions";
import { createPopupSchema } from "@/server/validations/admin/marketing";
import {
  campaignIsEligible,
  classifyDevice,
  classifyStorefrontPath,
  isFrequencyConsumed,
  isInternalPopupHref,
  pathMatchesTargets,
  pickHighestPriority,
  popupStorageKey,
  resolveClientTrigger,
  resolvePopupCopy,
  sanitizePopupCtaUrl,
  scheduleIsActive,
  type PopupCampaignRecord,
  type PopupEligiblePayload,
} from "./marketing-popup";

function campaign(
  overrides: Partial<PopupCampaignRecord> = {},
): PopupCampaignRecord {
  return {
    id: "camp-1",
    name: "Test",
    content: {
      fr: { title: "Offre", body: "Découvrez la collection.", ctaLabel: "Voir" },
      en: { title: "Offer", body: "Discover the collection.", ctaLabel: "Shop" },
      ar: { title: "عرض", body: "اكتشف المجموعة.", ctaLabel: "تسوق" },
      ctaUrl: "/fr/shop",
    },
    trigger: "DELAY",
    delaySeconds: 5,
    scrollPercent: null,
    pageTargets: ["ALL"],
    localeTarget: "all",
    deviceTarget: "ALL",
    audience: "ALL",
    frequency: "ONCE_PER_SESSION",
    priority: 50,
    imageUrl: null,
    isActive: true,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

const baseInput = {
  now: new Date("2026-08-30T10:00:00.000Z"),
  locale: "fr" as const,
  pathname: "/fr",
  device: "DESKTOP" as const,
  authenticated: false,
};

describe("popup validation", () => {
  it("requires a name and localized copy", () => {
    const parsed = createPopupSchema.safeParse({
      name: "A",
      content: { fr: { title: "", body: "" } },
      trigger: "IMMEDIATE",
    });
    assert.equal(parsed.success, false);
  });

  it("accepts a complete FR campaign", () => {
    const parsed = createPopupSchema.safeParse({
      name: "Newsletter",
      content: {
        fr: { title: "Newsletter", body: "Inscrivez-vous.", ctaLabel: "OK" },
        ctaUrl: "/fr",
      },
      trigger: "DELAY",
      delaySeconds: 8,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects javascript CTA URLs", () => {
    const parsed = createPopupSchema.safeParse({
      name: "Bad",
      content: {
        fr: { title: "Hi", body: "There" },
        ctaUrl: "javascript:alert(1)",
      },
      trigger: "IMMEDIATE",
    });
    assert.equal(parsed.success, false);
  });

  it("requires delay seconds for DELAY", () => {
    const parsed = createPopupSchema.safeParse({
      name: "Delay",
      content: { fr: { title: "Hi", body: "There" } },
      trigger: "DELAY",
    });
    assert.equal(parsed.success, false);
  });

  it("requires scroll percent for SCROLL", () => {
    const parsed = createPopupSchema.safeParse({
      name: "Scroll",
      content: { fr: { title: "Hi", body: "There" } },
      trigger: "SCROLL",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects end before start", () => {
    const parsed = createPopupSchema.safeParse({
      name: "Dates",
      content: { fr: { title: "Hi", body: "There" } },
      trigger: "IMMEDIATE",
      startsAt: "2026-09-02T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(parsed.success, false);
  });

  it("clamps priority via schema min/max", () => {
    const parsed = createPopupSchema.safeParse({
      name: "Prio",
      content: { fr: { title: "Hi", body: "There" } },
      trigger: "IMMEDIATE",
      priority: 0,
    });
    assert.equal(parsed.success, false);
  });
});

describe("CTA security", () => {
  it("allows internal paths and https, strips unsafe schemes", () => {
    assert.equal(sanitizePopupCtaUrl("/fr/shop?utm_source=popup"), "/fr/shop?utm_source=popup");
    assert.equal(
      sanitizePopupCtaUrl("https://www.lorvex.ma/fr/shop?utm_campaign=x"),
      "https://www.lorvex.ma/fr/shop?utm_campaign=x",
    );
    assert.equal(sanitizePopupCtaUrl("javascript:alert(1)"), null);
    assert.equal(sanitizePopupCtaUrl("data:text/html,hi"), null);
    assert.equal(sanitizePopupCtaUrl("vbscript:msg"), null);
    assert.equal(sanitizePopupCtaUrl("//evil.example"), null);
    assert.equal(sanitizePopupCtaUrl("http://evil.example"), null);
    assert.equal(isInternalPopupHref("/fr/shop"), true);
    assert.equal(isInternalPopupHref("https://example.com"), false);
  });
});

describe("eligibility, targeting, schedule", () => {
  it("hides inactive and out-of-window campaigns", () => {
    assert.equal(
      campaignIsEligible({
        ...baseInput,
        campaign: campaign({ isActive: false }),
      }),
      null,
    );
    assert.equal(
      scheduleIsActive(
        baseInput.now,
        "2026-09-01T00:00:00.000Z",
        "2026-09-30T00:00:00.000Z",
      ),
      false,
    );
    assert.equal(
      campaignIsEligible({
        ...baseInput,
        campaign: campaign({
          startsAt: "2026-08-01T00:00:00.000Z",
          endsAt: "2026-08-02T00:00:00.000Z",
        }),
      }),
      null,
    );
  });

  it("filters locale, page, device, and audience", () => {
    assert.equal(
      campaignIsEligible({
        ...baseInput,
        campaign: campaign({ localeTarget: "en" }),
      }),
      null,
    );
    assert.ok(
      campaignIsEligible({
        ...baseInput,
        locale: "en",
        pathname: "/en",
        campaign: campaign({ localeTarget: "en" }),
      }),
    );
    assert.equal(classifyStorefrontPath("/fr/checkout"), "BLOCKED");
    assert.equal(classifyStorefrontPath("/fr/cart"), "BLOCKED");
    assert.equal(classifyStorefrontPath("/admin"), "BLOCKED");
    assert.equal(pathMatchesTargets("/fr/checkout", ["ALL"]), false);
    assert.equal(pathMatchesTargets("/fr/shop", ["SHOP"]), true);
    assert.equal(pathMatchesTargets("/fr/about", ["HOME"]), false);
    assert.equal(
      campaignIsEligible({
        ...baseInput,
        pathname: "/fr/shop",
        campaign: campaign({ pageTargets: ["HOME"] }),
      }),
      null,
    );
    assert.equal(
      campaignIsEligible({
        ...baseInput,
        device: "MOBILE",
        campaign: campaign({ deviceTarget: "DESKTOP" }),
      }),
      null,
    );
    assert.equal(
      campaignIsEligible({
        ...baseInput,
        authenticated: true,
        campaign: campaign({ audience: "GUESTS" }),
      }),
      null,
    );
    assert.ok(
      campaignIsEligible({
        ...baseInput,
        authenticated: true,
        campaign: campaign({ audience: "AUTHENTICATED" }),
      }),
    );
  });

  it("does not render empty locale copy", () => {
    assert.equal(
      resolvePopupCopy({ fr: { title: "A", body: "B" } }, "ar"),
      null,
    );
    assert.ok(resolvePopupCopy({ title: "Legacy", body: "Text" }, "fr"));
  });
});

describe("frequency and priority", () => {
  it("uses campaign-specific keys", () => {
    assert.equal(popupStorageKey("abc"), "lorvex_popup_abc");
    assert.notEqual(popupStorageKey("a"), popupStorageKey("b"));
  });

  it("enforces session and daily caps, not every-visit", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    assert.equal(isFrequencyConsumed("EVERY_VISIT", now, now), false);
    assert.equal(isFrequencyConsumed("ONCE_PER_SESSION", now, now), true);
    assert.equal(isFrequencyConsumed("ONCE_PER_DAY", now - 1000, now), true);
    assert.equal(
      isFrequencyConsumed("ONCE_PER_DAY", now - 25 * 60 * 60 * 1000, now),
      false,
    );
  });

  it("picks the lowest priority number", () => {
    const a: PopupEligiblePayload = {
      id: "b",
      trigger: "IMMEDIATE",
      delaySeconds: null,
      scrollPercent: null,
      frequency: "EVERY_VISIT",
      priority: 10,
      imageUrl: null,
      ctaUrl: null,
      title: "B",
      body: "B",
      ctaLabel: null,
      locale: "fr",
    };
    const b: PopupEligiblePayload = { ...a, id: "a", priority: 1, title: "A" };
    assert.equal(pickHighestPriority([a, b])?.id, "a");
  });
});

describe("security and analytics cap", () => {
  it("does not grant marketing.manage to ANALYST", () => {
    assert.equal(roleHasPermission("ANALYST", "marketing.manage"), false);
    assert.equal(roleHasPermission("EDITOR", "marketing.manage"), false);
    assert.equal(roleHasPermission("ADMIN", "marketing.manage"), true);
  });

  it("keeps the dashboard page_view take cap at 4000", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/repositories/admin/analytics.ts"),
      "utf8",
    );
    assert.match(source, /take:\s*4000/);
  });
});

describe("RTL mobile desktop triggers", () => {
  it("uses RTL for Arabic copy", () => {
    assert.equal(getDirection("ar"), "rtl");
    assert.equal(getDirection("fr"), "ltr");
  });

  it("classifies mobile vs desktop and falls back exit-intent", () => {
    assert.equal(classifyDevice(390), "MOBILE");
    assert.equal(classifyDevice(1280), "DESKTOP");
    assert.equal(resolveClientTrigger("EXIT_INTENT", "MOBILE"), "DELAY");
    assert.equal(resolveClientTrigger("EXIT_INTENT", "DESKTOP"), "EXIT_INTENT");
  });
});
