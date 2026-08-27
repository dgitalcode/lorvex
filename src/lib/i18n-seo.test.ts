import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicPageUrl } from "@/config/site";
import { isLocale } from "@/i18n/get-dictionary";
import {
  HREFLANG_BY_LOCALE,
  hreflangLanguages,
  isHreflangPath,
  localeAlternates,
  localeCanonical,
  ogLocale,
  swapLocalePath,
} from "./i18n-seo";

describe("international SEO targeting", () => {
  it("maps URL locales to Morocco hreflang tags", () => {
    assert.equal(HREFLANG_BY_LOCALE.fr, "fr-MA");
    assert.equal(HREFLANG_BY_LOCALE.en, "en-MA");
    assert.equal(HREFLANG_BY_LOCALE.ar, "ar-MA");
  });

  it("rejects unsupported locales as indexable locale prefixes", () => {
    assert.equal(isLocale("de"), false);
    assert.equal(isLocale("xx"), false);
    assert.equal(isLocale("es"), false);
    assert.equal(isLocale("fr-MA"), false);
  });
});

describe("hreflang clusters", () => {
  const product = "/product/noir-imperial-40";

  it("includes fr-MA, en-MA, ar-MA and x-default on every cluster", () => {
    for (const suffix of ["", "/shop", product]) {
      const languages = hreflangLanguages(suffix);
      assert.deepEqual(Object.keys(languages).sort(), [
        "ar-MA",
        "en-MA",
        "fr-MA",
        "x-default",
      ]);
      assert.equal(languages["x-default"], languages["fr-MA"]);
    }
  });

  it("uses reciprocal absolute URLs for the same page", () => {
    const languages = hreflangLanguages(product);
    assert.equal(languages["fr-MA"], publicPageUrl("/fr/product/noir-imperial-40"));
    assert.equal(languages["en-MA"], publicPageUrl("/en/product/noir-imperial-40"));
    assert.equal(languages["ar-MA"], publicPageUrl("/ar/product/noir-imperial-40"));
    assert.equal(languages["x-default"], languages["fr-MA"]);
  });

  it("never emits Vercel, apex, or language-only hreflang keys", () => {
    const languages = hreflangLanguages("/shop");
    const blob = JSON.stringify(languages);
    assert.equal(blob.includes("lorvex-eight"), false);
    assert.equal(blob.includes("vercel.app"), false);
    assert.equal(blob.includes('"fr":'), false);
    assert.equal("fr" in languages, false);
    assert.equal("en" in languages, false);
    assert.equal("ar" in languages, false);
    for (const url of Object.values(languages)) {
      assert.equal(new URL(url).hostname === "lorvex.ma", false);
    }
  });
});

describe("canonicals", () => {
  it("canonicalizes each locale to itself", () => {
    const path = "/collections/heritage";
    assert.equal(localeCanonical("fr", path), publicPageUrl("/fr/collections/heritage"));
    assert.equal(localeCanonical("en", path), publicPageUrl("/en/collections/heritage"));
    assert.equal(localeCanonical("ar", path), publicPageUrl("/ar/collections/heritage"));
  });

  it("keeps canonical and hreflang self-link aligned", () => {
    const { canonical, languages } = localeAlternates("en", "/faq");
    assert.equal(canonical, languages["en-MA"]);
    assert.equal(languages["fr-MA"], localeCanonical("fr", "/faq"));
    assert.equal(languages["ar-MA"], localeCanonical("ar", "/faq"));
  });
});

describe("language switcher paths", () => {
  it("preserves the equivalent localized page", () => {
    assert.equal(
      swapLocalePath("/fr/product/noir-imperial-40", "fr", "en"),
      "/en/product/noir-imperial-40",
    );
    assert.equal(swapLocalePath("/en/shop", "en", "ar"), "/ar/shop");
  });
});

describe("Open Graph locale", () => {
  it("uses Facebook-style regional locales", () => {
    assert.equal(ogLocale("fr"), "fr_MA");
    assert.equal(ogLocale("en"), "en_MA");
    assert.equal(ogLocale("ar"), "ar_MA");
  });
});

describe("private routes", () => {
  it("does not expose hreflang for search, cart, checkout, account, auth, or orders", () => {
    assert.equal(isHreflangPath("/search"), false);
    assert.equal(isHreflangPath("/cart"), false);
    assert.equal(isHreflangPath("/checkout"), false);
    assert.equal(isHreflangPath("/account"), false);
    assert.equal(isHreflangPath("/account/orders"), false);
    assert.equal(isHreflangPath("/auth/sign-in"), false);
    assert.equal(isHreflangPath("/order/LX-1"), false);
    assert.equal(isHreflangPath(""), true);
    assert.equal(isHreflangPath("/shop"), true);
    assert.equal(isHreflangPath("/product/noir-imperial-40"), true);
  });
});
