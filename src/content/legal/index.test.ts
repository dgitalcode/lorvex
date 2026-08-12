import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLegalDocument, isLegalSlug, LEGAL_SLUGS } from "./index";

const contact = {
  siteName: "LORVEX",
  supportEmail: "concierge@lorvex.ma",
  supportPhone: "+212 5 22 00 00 00",
};

describe("legal documents", () => {
  it("exposes privacy and terms for all locales", () => {
    for (const locale of ["fr", "en", "ar"] as const) {
      for (const slug of LEGAL_SLUGS) {
        const doc = getLegalDocument(locale, slug, contact);
        assert.equal(doc.slug, slug);
        assert.ok(doc.title.length > 3);
        assert.ok(doc.sections.length >= 8);
        assert.ok(doc.description.includes(locale === "ar" ? "لورفكس" : "LORVEX") || doc.intro.length > 20);
      }
    }
  });

  it("keeps contact details from settings in the documents", () => {
    const privacy = getLegalDocument("fr", "privacy", contact);
    const joined = privacy.sections.flatMap((s) => s.paragraphs).join(" ");
    assert.ok(joined.includes(contact.supportEmail));
    assert.ok(joined.includes(contact.supportPhone));
  });

  it("validates legal slugs only", () => {
    assert.equal(isLegalSlug("privacy"), true);
    assert.equal(isLegalSlug("terms"), true);
    assert.equal(isLegalSlug("cookies"), false);
  });
});
