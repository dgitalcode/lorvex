import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeDocumentTitle } from "@/lib/document-title";
import { buildFaqPageJsonLd } from "@/lib/json-ld";
import { publicPageUrl } from "@/config/site";
import { hreflangLanguages } from "@/lib/i18n-seo";
import {
  getStorefrontFaq,
  looksLikeArabic,
  storefrontCopy,
} from "./storefront-copy";

describe("localized storefront metadata language", () => {
  it("keeps FR copy in French, EN in English, AR in Arabic", () => {
    const fr = storefrontCopy("fr");
    const en = storefrontCopy("en");
    const ar = storefrontCopy("ar");

    assert.match(fr.homeTitle, /Maroc|montre/i);
    assert.match(en.homeTitle, /Morocco|watch/i);
    assert.equal(looksLikeArabic(ar.homeTitle), true);
    assert.equal(looksLikeArabic(ar.faqH1), true);
    assert.equal(looksLikeArabic(fr.homeTitle), false);
    assert.equal(fr.homeDescription === en.homeDescription, false);
    assert.equal(fr.shopDescription === fr.homeDescription, false);
  });

  it("composes homepage titles with a single brand suffix", () => {
    for (const locale of ["fr", "en", "ar"] as const) {
      const title = composeDocumentTitle(storefrontCopy(locale).homeTitle);
      assert.equal(title.includes("LORVEX · LORVEX"), false);
      assert.equal((title.match(/LORVEX/g) ?? []).length, 1);
    }
  });
});

describe("FAQ visible content and JSON-LD", () => {
  it("keeps the same questions and answers in FAQPage JSON-LD", () => {
    for (const locale of ["fr", "en", "ar"] as const) {
      const items = getStorefrontFaq(locale);
      const jsonLd = buildFaqPageJsonLd(items);
      assert.ok(jsonLd);
      const entities = jsonLd!.mainEntity as {
        name: string;
        acceptedAnswer: { text: string };
      }[];
      assert.equal(entities.length, items.length);
      items.forEach((item, index) => {
        assert.equal(entities[index]?.name, item.question);
        assert.equal(entities[index]?.acceptedAnswer.text, item.answer);
      });
    }
  });
});

describe("hreflang regression", () => {
  it("still emits Morocco clusters on www", () => {
    const languages = hreflangLanguages("");
    assert.equal(languages["fr-MA"], publicPageUrl("/fr"));
    assert.equal(languages["en-MA"], publicPageUrl("/en"));
    assert.equal(languages["ar-MA"], publicPageUrl("/ar"));
    assert.equal(languages["x-default"], languages["fr-MA"]);
    assert.equal(JSON.stringify(languages).includes("vercel.app"), false);
  });
});
