import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStorefrontSettings } from "./storefront-settings";

describe("storefront settings resolution", () => {
  it("falls back to siteConfig defaults when DB row is missing", () => {
    const settings = resolveStorefrontSettings(null);
    assert.equal(settings.siteName, "LORVEX");
    assert.ok(settings.supportEmail.includes("@"));
    assert.equal(settings.maintenanceMode, false);
  });

  it("prefers persisted admin settings over defaults", () => {
    const settings = resolveStorefrontSettings({
      id: "default",
      siteName: "LORVEX Maison",
      tagline: "Custom tagline",
      logoUrl: null,
      logoDarkUrl: null,
      faviconUrl: null,
      supportEmail: "hello@lorvex.ma",
      supportPhone: "+212 5 00 00 00 00",
      whatsappNumber: "212611111111",
      socialInstagram: "https://instagram.com/custom",
      socialFacebook: null,
      socialTikTok: null,
      socialYoutube: null,
      defaultLocale: "en",
      defaultCurrency: "EUR",
      enableGuestCheckout: false,
      enableReviews: false,
      maintenanceMode: true,
      theme: null,
      seoDefaults: null,
      updatedAt: new Date(),
    });

    assert.equal(settings.siteName, "LORVEX Maison");
    assert.equal(settings.tagline, "Custom tagline");
    assert.equal(settings.supportEmail, "hello@lorvex.ma");
    assert.equal(settings.whatsappNumber, "212611111111");
    assert.equal(settings.socialInstagram, "https://instagram.com/custom");
    assert.equal(settings.maintenanceMode, true);
    assert.equal(settings.enableGuestCheckout, false);
  });
});
