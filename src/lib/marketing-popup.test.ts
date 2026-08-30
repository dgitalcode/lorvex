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
  selectEligibleWinner,
  visiblePopupCta,
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
    assert.equal(sanitizePopupCtaUrl("file:///etc/passwd"), null);
    assert.equal(sanitizePopupCtaUrl("blob:https://www.lorvex.ma/x"), null);
    assert.equal(isInternalPopupHref("/fr/shop"), true);
    assert.equal(isInternalPopupHref("/fr/collections/haute-complication"), true);
    assert.equal(isInternalPopupHref("/fr/product/noir-imperial-40"), true);
    assert.equal(isInternalPopupHref("https://example.com"), false);
  });
});

describe("CTA rendering", () => {
  it("renders when both a valid label and URL are present", () => {
    const copy = resolvePopupCopy(
      {
        fr: { title: "Offre", body: "Découvrez.", ctaLabel: "Shop now" },
        ctaUrl: "https://www.lorvex.ma/fr/shop",
      },
      "fr",
    );
    assert.deepEqual(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl), {
      label: "Shop now",
      href: "https://www.lorvex.ma/fr/shop",
    });
    const eligible = campaignIsEligible({ ...baseInput, campaign: campaign() });
    assert.equal(eligible?.ctaLabel, "Voir");
    assert.equal(eligible?.ctaUrl, "/fr/shop");
    assert.ok(visiblePopupCta(eligible?.ctaLabel, eligible?.ctaUrl));
  });

  it("does not render when the CTA label is missing", () => {
    const copy = resolvePopupCopy(
      { fr: { title: "Offre", body: "Découvrez." }, ctaUrl: "/fr/shop" },
      "fr",
    );
    assert.equal(copy?.ctaUrl, "/fr/shop");
    assert.equal(copy?.ctaLabel, null);
    assert.equal(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl, "fr"), null);
    assert.equal(visiblePopupCta("   ", "/fr/shop", "fr"), null);
  });

  it("does not render when the CTA URL is missing", () => {
    const copy = resolvePopupCopy(
      { fr: { title: "Offre", body: "Découvrez.", ctaLabel: "Shop now" } },
      "fr",
    );
    assert.equal(copy?.ctaLabel, "Shop now");
    assert.equal(copy?.ctaUrl, null);
    assert.equal(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl, "fr"), null);
    assert.equal(visiblePopupCta("Shop now", null, "fr"), null);
  });

  it("keeps internal paths as the CTA href", () => {
    for (const path of [
      "/fr/shop",
      "/fr/collections/haute-complication",
      "/fr/product/noir-imperial-40",
    ]) {
      const copy = resolvePopupCopy(
        { fr: { title: "Offre", body: "Go.", ctaLabel: "Shop now" }, ctaUrl: path },
        "fr",
      );
      assert.deepEqual(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl, "en"), {
        label: "Shop now",
        href: path,
      });
    }
  });

  it("keeps https external URLs as the CTA href", () => {
    const copy = resolvePopupCopy(
      {
        fr: { title: "Offre", body: "Go.", ctaLabel: "Instagram" },
        ctaUrl: "https://www.instagram.com/lorvex.ma/",
      },
      "fr",
    );
    assert.deepEqual(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl, "en"), {
      label: "Instagram",
      href: "https://www.instagram.com/lorvex.ma/",
    });
  });

  it("does not render an unsafe CTA URL", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "vbscript:msg",
      "file:///tmp",
      "blob:https://www.lorvex.ma/x",
      "//evil.example",
    ]) {
      const copy = resolvePopupCopy(
        { fr: { title: "Offre", body: "Go.", ctaLabel: "Shop now" }, ctaUrl: bad },
        "fr",
      );
      assert.equal(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl, "fr"), null);
    }
  });

  it("does not drop a root-level CTA label when localized title/body exist", () => {
    const copy = resolvePopupCopy(
      {
        fr: { title: "NEW FEATURE", body: "NEW FEATURE" },
        ctaLabel: "Shop now",
        ctaUrl: "https://www.lorvex.ma/fr/shop",
      },
      "fr",
    );
    assert.deepEqual(visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl), {
      label: "Shop now",
      href: "https://www.lorvex.ma/fr/shop",
    });
  });

  it("never renders a URL-looking label as public CTA text", () => {
    const copy = resolvePopupCopy(
      {
        fr: {
          title: "NEW FEATURE",
          body: "NEW FEATURE",
          ctaLabel: "https://www.instagram.com/lorvex.ma/",
        },
        ctaUrl: "https://www.instagram.com/lorvex.ma/",
      },
      "fr",
    );
    const cta = visiblePopupCta(copy?.ctaLabel, copy?.ctaUrl, "fr");
    assert.equal(cta?.href, "https://www.instagram.com/lorvex.ma/");
    assert.equal(cta?.label, "Instagram");
    assert.equal(/https?:\/\//i.test(cta?.label ?? "https://"), false);

    const shop = visiblePopupCta(
      "https://www.lorvex.ma/fr/shop",
      "https://www.lorvex.ma/fr/shop",
      "en",
    );
    assert.equal(shop?.label, "Shop");
    assert.equal(shop?.href, "https://www.lorvex.ma/fr/shop");

    const collection = visiblePopupCta(
      "https://www.lorvex.ma/fr/collections/haute-complication",
      "https://www.lorvex.ma/fr/collections/haute-complication",
      "en",
    );
    assert.equal(collection?.label, "View collection");

    const generic = visiblePopupCta(
      "https://example.com/x",
      "https://example.com/x",
      "fr",
    );
    assert.equal(generic?.label, "Découvrir");
    assert.equal(generic?.href, "https://example.com/x");
  });

  it("keeps storefront CTA click tracking as popup_click", () => {
    const host = readFileSync(
      join(process.cwd(), "src/components/storefront/marketing-popup-host.tsx"),
      "utf8",
    );
    const dialog = readFileSync(
      join(process.cwd(), "src/components/storefront/marketing-popup-dialog.tsx"),
      "utf8",
    );
    assert.match(host, /trackPopupEvent\("popup_click", campaign\.id\)/);
    assert.equal([...host.matchAll(/trackPopupEvent\("popup_click"/g)].length, 1);
    assert.match(dialog, /onCta\?\.\(\)/);
    assert.match(dialog, /visiblePopupCta/);
    assert.match(dialog, /target="_self"/);
    assert.match(host, /seen=/);
    assert.doesNotMatch(host, /pickHighestPriority/);
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

describe("priority, frequency, and trigger selection", () => {
  function payload(
    id: string,
    priority: number,
    extra: Partial<PopupCampaignRecord> = {},
  ): PopupEligiblePayload {
    const result = campaignIsEligible({
      ...baseInput,
      campaign: campaign({ id, name: id, priority, ...extra }),
    });
    assert.ok(result);
    return result;
  }

  it("selects priority 10 before 30 before 50, then the next after consume", () => {
    const fifty = payload("camp-50", 50);
    const ten = payload("camp-10", 10);
    const thirty = payload("camp-30", 30);
    const all = [fifty, ten, thirty];
    assert.equal(selectEligibleWinner(all)?.id, "camp-10");
    assert.equal(selectEligibleWinner(all, ["camp-10"])?.id, "camp-30");
    assert.equal(selectEligibleWinner(all, ["camp-10", "camp-30"])?.id, "camp-50");
  });

  it("does not let a consumed high-priority session campaign block EVERY_VISIT", () => {
    const seen = payload("camp-a", 10, { frequency: "ONCE_PER_SESSION" });
    const next = payload("camp-b", 20, { frequency: "EVERY_VISIT" });
    assert.equal(isFrequencyConsumed(seen.frequency, Date.now()), true);
    assert.equal(selectEligibleWinner([seen, next], [seen.id])?.id, "camp-b");
  });

  it("does not let an IMMEDIATE lower-priority campaign bypass a DELAY winner", () => {
    const delayed = payload("camp-delay", 10, {
      trigger: "DELAY",
      delaySeconds: 30,
    });
    const immediate = payload("camp-now", 20, { trigger: "IMMEDIATE" });
    const winner = selectEligibleWinner([delayed, immediate]);
    assert.equal(winner?.id, "camp-delay");
    assert.equal(winner?.trigger, "DELAY");
    assert.notEqual(winner?.id, "camp-now");
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
