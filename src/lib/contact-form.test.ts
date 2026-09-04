import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { storefrontCopy } from "@/content/storefront-copy";
import { buildContactEnquiryEmail } from "@/lib/email/contact-enquiry-template";

describe("contact enquiry form", () => {
  it("does not post to mailto from the contact page", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/[locale]/contact/page.tsx"),
      "utf8",
    );
    const form = readFileSync(
      join(process.cwd(), "src/components/storefront/contact-form.tsx"),
      "utf8",
    );
    assert.equal(page.includes("mailto:"), true);
    assert.doesNotMatch(page, /action=\{?[`'"]mailto:/);
    assert.equal(form.includes("mailto:"), false);
    assert.match(form, /submitContactEnquiry/);
    assert.match(form, /action=\{action\}/);
  });

  it("localizes success and error copy in FR, EN, and AR", () => {
    assert.match(storefrontCopy("fr").contactSuccess, /envoy/i);
    assert.match(storefrontCopy("en").contactSuccess, /sent/i);
    assert.equal(storefrontCopy("ar").contactSuccess.includes("إرسال"), true);
    assert.notEqual(
      storefrontCopy("fr").contactRateLimited,
      storefrontCopy("en").contactRateLimited,
    );
  });

  it("escapes enquiry HTML and keeps a branded subject", () => {
    const email = buildContactEnquiryEmail({
      name: `<script>alert(1)</script>`,
      email: "guest@example.com",
      subject: "Ref & size",
      message: "Hello\nWorld",
      locale: "fr",
    });
    assert.equal(email.html.includes("<script>"), false);
    assert.match(email.html, /&lt;script&gt;/);
    assert.match(email.html, /<br\/>/);
    assert.match(email.subject, /LORVEX/);
    assert.equal(email.html.includes("localhost"), false);
    assert.match(email.html, /https:\/\/www\.lorvex\.ma\/icons\/icon-192\.png/);
    assert.match(email.html, /mailto:guest@example\.com/);
    assert.match(email.html, /Répondre au client/);
    assert.doesNotMatch(email.html, /style="style=/);
  });
});
