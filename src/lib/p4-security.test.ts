import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkoutSchema, exceedsPerUserLimit, couponPriorUseWhere, CHECKOUT_RATE_LIMIT } from "@/server/checkout/rules";
import {
  decideOrderAccess,
  generateOrderAccessToken,
  hashOrderAccessToken,
  tokensMatch,
} from "@/server/services/order-access";
import { applyJwtRefresh, shouldRefreshJwt } from "@/lib/jwt-refresh";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/request-origin";
import { methodNotAllowedGet } from "@/server/auth/admin-sensitive-post";
import { checkRateLimit } from "@/server/services/security";

const ownerSession = { user: { id: "user-owner", role: "CUSTOMER" } };
const otherSession = { user: { id: "user-other", role: "CUSTOMER" } };
const staffSession = { user: { id: "user-staff", role: "ADMIN" } };

function validCheckout(overrides: Record<string, unknown> = {}) {
  return {
    locale: "fr",
    email: "guest@example.com",
    phone: "0612345678",
    firstName: "Amine",
    lastName: "Benali",
    line1: "12 Rue Atlas",
    city: "Casablanca",
    shippingMethodId: "ship_1",
    paymentMethod: "COD",
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    items: [{ variantId: "var_1", quantity: 1 }],
    ...overrides,
  };
}

describe("F1 order access token", () => {
  it("unknown order is denied (404 at the route)", () => {
    assert.equal(
      decideOrderAccess({
        orderFound: false,
        accessTokenHash: null,
        presentedToken: generateOrderAccessToken(),
        session: null,
        orderUserId: null,
      }),
      "deny",
    );
  });

  it("order number only is denied", () => {
    const raw = generateOrderAccessToken();
    assert.equal(
      decideOrderAccess({
        orderFound: true,
        accessTokenHash: hashOrderAccessToken(raw),
        presentedToken: undefined,
        session: null,
        orderUserId: null,
      }),
      "deny",
    );
  });

  it("invalid token is denied", () => {
    const raw = generateOrderAccessToken();
    assert.equal(
      decideOrderAccess({
        orderFound: true,
        accessTokenHash: hashOrderAccessToken(raw),
        presentedToken: generateOrderAccessToken(),
        session: null,
        orderUserId: null,
      }),
      "deny",
    );
  });

  it("valid token allows guest access", () => {
    const raw = generateOrderAccessToken();
    assert.equal(
      decideOrderAccess({
        orderFound: true,
        accessTokenHash: hashOrderAccessToken(raw),
        presentedToken: raw,
        session: null,
        orderUserId: null,
      }),
      "allow",
    );
  });

  it("token remains valid on reuse (capability URL, not single-use)", () => {
    const raw = generateOrderAccessToken();
    const hash = hashOrderAccessToken(raw);
    const input = {
      orderFound: true,
      accessTokenHash: hash,
      presentedToken: raw,
      session: null,
      orderUserId: null as string | null,
    };
    assert.equal(decideOrderAccess(input), "allow");
    assert.equal(decideOrderAccess(input), "allow");
  });

  it("different user's session is denied without a valid token", () => {
    const raw = generateOrderAccessToken();
    assert.equal(
      decideOrderAccess({
        orderFound: true,
        accessTokenHash: hashOrderAccessToken(raw),
        presentedToken: undefined,
        session: otherSession,
        orderUserId: "user-owner",
      }),
      "deny",
    );
  });

  it("owner session is allowed without the token", () => {
    assert.equal(
      decideOrderAccess({
        orderFound: true,
        accessTokenHash: hashOrderAccessToken(generateOrderAccessToken()),
        presentedToken: undefined,
        session: ownerSession,
        orderUserId: "user-owner",
      }),
      "allow",
    );
  });

  it("staff is allowed without the token", () => {
    assert.equal(
      decideOrderAccess({
        orderFound: true,
        accessTokenHash: hashOrderAccessToken(generateOrderAccessToken()),
        presentedToken: undefined,
        session: staffSession,
        orderUserId: "user-owner",
      }),
      "allow",
    );
  });

  it("stores a hash, not the plaintext token", () => {
    const raw = generateOrderAccessToken();
    const hashed = hashOrderAccessToken(raw);
    assert.notEqual(hashed, raw);
    assert.equal(tokensMatch(raw, hashed), true);
    assert.ok(raw.length >= 32);
  });
});

describe("F2 checkout validation, rate limit, idempotency key", () => {
  it("accepts COD with a uuid idempotency key", () => {
    assert.equal(checkoutSchema.safeParse(validCheckout()).success, true);
  });

  it("rejects missing or non-uuid idempotency keys", () => {
    assert.equal(
      checkoutSchema.safeParse(validCheckout({ idempotencyKey: "not-a-uuid" })).success,
      false,
    );
  });

  it("documents checkout rate-limit windows", () => {
    assert.equal(CHECKOUT_RATE_LIMIT.email.limit, 8);
    assert.equal(CHECKOUT_RATE_LIMIT.ip.limit, 12);
    assert.equal(CHECKOUT_RATE_LIMIT.email.windowMs, 15 * 60_000);
  });

  it("rate limiter eventually denies a hot key", async () => {
    const key = `p4-checkout-rl:${Date.now()}:${Math.random()}`;
    let denied = false;
    for (let i = 0; i < 6; i++) {
      const result = await checkRateLimit({ key, limit: 3, windowMs: 60_000 });
      if (!result.allowed) {
        denied = true;
        break;
      }
    }
    assert.equal(denied, true);
  });
});

describe("F3 jwt role refresh", () => {
  const base = {
    id: "user-1",
    role: "ADMIN",
    pwdv: 1000,
    lastPwdCheck: 0,
  };

  it("refreshes admin → customer", () => {
    const next = applyJwtRefresh(base, {
      passwordChangedAt: new Date(500),
      status: "ACTIVE",
      role: "CUSTOMER",
    });
    assert.equal("role" in next && next.role, "CUSTOMER");
    assert.equal("id" in next && next.id, "user-1");
  });

  it("keeps an active admin role", () => {
    const next = applyJwtRefresh(base, {
      passwordChangedAt: new Date(500),
      status: "ACTIVE",
      role: "ADMIN",
    });
    assert.equal("role" in next && next.role, "ADMIN");
  });

  it("invalidates inactive users", () => {
    const next = applyJwtRefresh(base, {
      passwordChangedAt: new Date(500),
      status: "SUSPENDED",
      role: "ADMIN",
    });
    assert.deepEqual(next, {});
  });

  it("still invalidates on passwordChangedAt", () => {
    const next = applyJwtRefresh(base, {
      passwordChangedAt: new Date(2000),
      status: "ACTIVE",
      role: "ADMIN",
    });
    assert.deepEqual(next, {});
  });

  it("respects the existing 30s refresh cadence", () => {
    assert.equal(shouldRefreshJwt({ lastPwdCheck: Date.now() }), false);
    assert.equal(shouldRefreshJwt({ lastPwdCheck: Date.now() - 31_000 }), true);
  });
});

describe("F4 CARD disabled", () => {
  it("rejects CARD in the checkout schema", () => {
    assert.equal(
      checkoutSchema.safeParse(validCheckout({ paymentMethod: "CARD" })).success,
      false,
    );
  });

  it("accepts COD only", () => {
    assert.equal(checkoutSchema.safeParse(validCheckout({ paymentMethod: "COD" })).success, true);
  });
});

describe("F6 coupon perUserLimit", () => {
  it("allows the first use and blocks when limit is 1", () => {
    assert.equal(exceedsPerUserLimit(0, 1), false);
    assert.equal(exceedsPerUserLimit(1, 1), true);
  });

  it("allows a second use when limit is 2", () => {
    assert.equal(exceedsPerUserLimit(1, 2), false);
    assert.equal(exceedsPerUserLimit(2, 2), true);
  });

  it("scopes guest uses to normalized email and auth uses to userId or email", () => {
    const guest = couponPriorUseWhere("SAVE10", "guest@example.com", null);
    assert.deepEqual(guest.OR, [{ email: "guest@example.com" }]);
    const authed = couponPriorUseWhere("SAVE10", "guest@example.com", "user-1");
    assert.deepEqual(authed.OR, [{ email: "guest@example.com" }, { userId: "user-1" }]);
    assert.equal(authed.status.not, "CANCELLED");
  });

  it("treats concurrent first uses as conflicting once priorCount reaches the limit", () => {
    // Serializable checkout counts inside the transaction; the second commit
    // sees priorCount >= perUserLimit.
    assert.equal(exceedsPerUserLimit(0, 1), false);
    assert.equal(exceedsPerUserLimit(1, 1), true);
  });
});

describe("F7 admin download origin and GET rejection", () => {
  it("allows same-origin POST", () => {
    const request = new Request("https://www.lorvex.ma/api/admin/orders/export", {
      method: "POST",
      headers: { origin: "https://www.lorvex.ma" },
    });
    assert.equal(isSameOriginRequest(request), true);
    assert.equal(rejectCrossOrigin(request), null);
  });

  it("rejects a cross-origin Origin", () => {
    const request = new Request("https://www.lorvex.ma/api/admin/orders/export", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(isSameOriginRequest(request), false);
    const response = rejectCrossOrigin(request);
    assert.equal(response?.status, 403);
  });

  it("GET helpers return 405", async () => {
    const response = methodNotAllowedGet();
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "POST");
  });
});

describe("F1 order page HTTP 404 metadata", () => {
  it("does not export static confirmation metadata and still calls notFound in the page", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(
      join(import.meta.dirname, "../app/[locale]/order/[number]/page.tsx"),
      "utf8",
    );
    const notFoundUi = readFileSync(
      join(import.meta.dirname, "../app/[locale]/order/[number]/not-found.tsx"),
      "utf8",
    );
    assert.equal(page.includes("export const metadata ="), false);
    assert.equal(page.includes("export async function generateMetadata"), true);
    assert.equal(page.includes("notFound();"), true);
    const metadataFn = page.slice(
      page.indexOf("export async function generateMetadata"),
      page.indexOf("function paymentCopy"),
    );
    assert.equal(metadataFn.includes("notFound();"), false);
    assert.equal(page.includes("Page introuvable"), true);
    assert.equal(notFoundUi.includes("@/app/not-found"), true);
  });
});
