import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkoutSchema } from "@/server/checkout/rules";
import {
  checkoutErrorMessage,
  localeFromCheckout,
} from "@/server/checkout/messages";
import { sanitizeOpsMeta } from "@/lib/ops-log";
import { orderStatusLabel } from "@/lib/order-status-label";
import {
  ORDER_CONFIRMATION_TEMPLATE,
  buildOrderConfirmationEmail,
  confirmationEmailAlreadyDelivered,
} from "@/lib/email/order-confirmation-template";
import { sendOrderConfirmationIfNeeded } from "@/server/services/order-confirmation-email";
import type { Locale } from "@/config/site";

const payload = {
  locale: "fr" as Locale,
  number: "LX-20260902-AB12",
  email: "guest@example.com",
  firstName: "Amine",
  lastName: "Benali",
  line1: "12 Rue Atlas",
  city: "Casablanca",
  items: [
    {
      name: "Noir Impérial 40",
      quantity: 1,
      unitPrice: 12500,
      totalPrice: 12500,
    },
  ],
  subtotal: 12500,
  shippingTotal: 80,
  discountTotal: 0,
  grandTotal: 12580,
  currency: "MAD",
  paymentMethod: "COD",
};

describe("order confirmation email", () => {
  it("builds FR, EN and AR subjects and bodies without access tokens", () => {
    for (const locale of ["fr", "en", "ar"] as const) {
      const mail = buildOrderConfirmationEmail({ ...payload, locale });
      assert.match(mail.subject, /LX-20260902-AB12/);
      assert.match(mail.subject, /LORVEX/);
      assert.match(mail.html, /Noir Impérial 40/);
      assert.match(mail.html, /Casablanca/);
      assert.match(mail.html, /Amine/);
      assert.match(mail.html, /icon-192\.png/);
      assert.equal(mail.html.includes("localhost"), false);
      assert.doesNotMatch(mail.html, /\?k=/);
      assert.doesNotMatch(mail.html, /accessToken/);
      assert.doesNotMatch(mail.html, /idempotency/);
      if (locale === "fr") assert.match(mail.subject, /Confirmation de commande/);
      if (locale === "en") assert.match(mail.subject, /Order confirmation/);
      if (locale === "ar") assert.match(mail.subject, /تأكيد الطلب/);
    }
  });

  it("treats a SENT log as already delivered", () => {
    assert.equal(
      confirmationEmailAlreadyDelivered([
        { template: ORDER_CONFIRMATION_TEMPLATE, status: "FAILED" },
        { template: ORDER_CONFIRMATION_TEMPLATE, status: "SENT" },
      ]),
      true,
    );
    assert.equal(
      confirmationEmailAlreadyDelivered([
        { template: ORDER_CONFIRMATION_TEMPLATE, status: "FAILED" },
      ]),
      false,
    );
  });

  it("successful COD payload creates a single confirmation send; replay does not", async () => {
    let sends = 0;
    const logs: { template: string; status: string }[] = [];
    const first = await sendOrderConfirmationIfNeeded({
      orderNumber: payload.number,
      locale: "fr",
      loadLogs: async () => logs,
      loadPayload: async () => payload,
      send: async () => {
        sends += 1;
        logs.push({ template: ORDER_CONFIRMATION_TEMPLATE, status: "SENT" });
        return { ok: true as const, id: "msg_1" };
      },
      onError: async () => undefined,
    });
    const replay = await sendOrderConfirmationIfNeeded({
      orderNumber: payload.number,
      locale: "fr",
      loadLogs: async () => logs,
      loadPayload: async () => payload,
      send: async () => {
        sends += 1;
        return { ok: true as const, id: "msg_2" };
      },
      onError: async () => undefined,
    });
    assert.equal(first.ok, true);
    assert.equal(replay.reason, "already_sent");
    assert.equal(sends, 1);
  });

  it("does not send again when EmailLog already SENT", async () => {
    let sends = 0;
    const result = await sendOrderConfirmationIfNeeded({
      orderNumber: payload.number,
      locale: "fr",
      loadLogs: async () => [
        { template: ORDER_CONFIRMATION_TEMPLATE, status: "SENT" },
      ],
      loadPayload: async () => {
        throw new Error("should not load");
      },
      send: async () => {
        sends += 1;
        return { ok: true as const, id: "msg_2" };
      },
      onError: async () => undefined,
    });
    assert.equal(sends, 0);
    assert.equal(result.reason, "already_sent");
  });

  it("does not throw when the email provider fails", async () => {
    const result = await sendOrderConfirmationIfNeeded({
      orderNumber: payload.number,
      locale: "en",
      loadLogs: async () => [],
      loadPayload: async () => payload,
      send: async () => {
        throw new Error("resend down");
      },
      onError: async () => undefined,
    });
    assert.equal(result.attempted, true);
    assert.equal(result.ok, false);
  });
});

describe("checkout errors and COD restriction", () => {
  it("returns localized safe errors", () => {
    assert.match(checkoutErrorMessage("fr", "STOCK"), /montre/i);
    assert.match(checkoutErrorMessage("en", "STOCK"), /watch/i);
    assert.match(checkoutErrorMessage("ar", "STOCK"), /ساعات/);
    assert.match(checkoutErrorMessage("fr", "PAYMENT_METHOD"), /livraison/i);
    assert.equal(localeFromCheckout("ar"), "ar");
  });

  it("still rejects CARD at the schema boundary", () => {
    const parsed = checkoutSchema.safeParse({
      locale: "fr",
      email: "guest@example.com",
      phone: "0612345678",
      firstName: "Amine",
      lastName: "Benali",
      line1: "12 Rue Atlas",
      city: "Casablanca",
      shippingMethodId: "ship_1",
      paymentMethod: "CARD",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      items: [{ variantId: "var_1", quantity: 1 }],
    });
    assert.equal(parsed.success, false);
  });
});

describe("ops log redaction", () => {
  it("drops tokens and secrets from meta", () => {
    const clean = sanitizeOpsMeta({
      orderNumber: "LX-1",
      accessToken: "raw-secret",
      AUTH_SECRET: "nope",
      DATABASE_URL: "postgres://x",
    });
    assert.deepEqual(clean, { orderNumber: "LX-1" });
  });
});

describe("order status labels", () => {
  it("maps PENDING to a COD-received label, not paid", () => {
    assert.match(orderStatusLabel("fr", "PENDING"), /Reçue/);
    assert.doesNotMatch(orderStatusLabel("en", "PENDING"), /Paid/);
    assert.match(orderStatusLabel("ar", "SHIPPED"), /الشحن/);
  });
});
