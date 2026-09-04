import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PRODUCTION_SITE_ORIGIN, siteConfig } from "@/config/site";
import { buildAbandonedCartEmail } from "@/lib/email/abandoned-cart-template";
import { buildContactEnquiryEmail } from "@/lib/email/contact-enquiry-template";
import {
  emailLogoUrl,
  emailSiteUrl,
  renderLorvexEmail,
} from "@/lib/email/layout";
import { buildPasswordResetEmail } from "@/lib/email/password-reset-template";

describe("shared LORVEX email layout", () => {
  it("uses the production origin for chrome assets and links", () => {
    assert.equal(emailSiteUrl(), PRODUCTION_SITE_ORIGIN);
    assert.equal(emailLogoUrl(), `${PRODUCTION_SITE_ORIGIN}/icons/icon-192.png`);
    const html = renderLorvexEmail({
      locale: "en",
      preheader: "Hidden preview",
      title: "Preview title",
      bodyHtml: "<p>Body copy</p>",
      cta: { href: `${PRODUCTION_SITE_ORIGIN}/en/shop`, label: "Visit LORVEX" },
    });
    assert.match(html, /alt="LORVEX"/);
    assert.match(html, /Luxury Timepieces/);
    assert.match(html, /Hidden preview/);
    assert.match(html, /www\.lorvex\.ma/);
    assert.match(html, /mailto:concierge@lorvex\.ma/);
    assert.equal(html.includes("localhost"), false);
    assert.doesNotMatch(html, /RESEND_API_KEY|AUTH_SECRET|BACKUP_ENCRYPTION/);
  });

  it("marks Arabic chrome as RTL", () => {
    const html = renderLorvexEmail({
      locale: "ar",
      preheader: "معاينة",
      title: "عنوان",
      bodyHtml: "<p>نص</p>",
    });
    assert.match(html, /dir="rtl"/);
    assert.match(html, /lang="ar"/);
  });
});

describe("contact enquiry template", () => {
  it("renders customer fields and a mailto reply CTA", () => {
    const mail = buildContactEnquiryEmail({
      name: "Sara El Fassi",
      email: "sara@example.com",
      subject: "Noir Imperial",
      message: "Disponibilité ?",
      locale: "en",
      supportEmail: siteConfig.supportEmail,
    });
    assert.equal(mail.subject, "New contact enquiry — LORVEX");
    assert.match(mail.html, /Sara El Fassi/);
    assert.match(mail.html, /sara@example\.com/);
    assert.match(mail.html, /Noir Imperial/);
    assert.match(mail.html, /Disponibilité/);
    assert.match(mail.html, /mailto:sara@example\.com\?subject=/);
    assert.match(mail.html, /Reply to customer/);
    assert.doesNotMatch(mail.html, /company|honeypot|rateLimit/);
  });
});

describe("password reset template", () => {
  it("keeps the reset token in the URL only and brands the chrome", () => {
    const mail = buildPasswordResetEmail({
      locale: "fr",
      token: "reset-token-value",
    });
    assert.match(mail.subject, /LORVEX/);
    assert.match(mail.resetUrl, /reset-token-value/);
    assert.match(mail.html, /Réinitialiser mon mot de passe/);
    assert.match(mail.html, /icon-192\.png/);
    assert.doesNotMatch(mail.html, /RESEND_API_KEY/);
  });
});

describe("abandoned cart template", () => {
  it("escapes item names and uses a production cart CTA", () => {
    const mail = buildAbandonedCartEmail({
      items: [{ name: "<b>Watch</b>", quantity: 1, unitPrice: 100 }],
      total: 100,
      currency: "MAD",
    });
    assert.equal(mail.html.includes("<b>Watch</b>"), false);
    assert.match(mail.html, /&lt;b&gt;Watch/);
    assert.match(mail.html, /https:\/\/www\.lorvex\.ma\/fr\/cart/);
  });
});

describe("sendTransactionalEmail reply-to contract", () => {
  it("keeps optional replyTo and a lorvex.ma from fallback", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/email.ts"),
      "utf8",
    );
    assert.match(source, /replyTo\?: string/);
    assert.match(source, /input\.replyTo/);
    assert.match(source, /EMAIL_FROM/);
    assert.match(source, /noreply@lorvex\.ma/);
  });
});
