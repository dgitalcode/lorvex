import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkRateLimit,
  createAtomicMemoryRateLimitStore,
  evaluateRateLimitHit,
  hashedRateLimitKey,
  rateLimitRetryAfterHeader,
  rateLimitWindowStart,
  type RateLimitStore,
} from "@/server/services/security";
import { CHECKOUT_RATE_LIMIT } from "@/server/checkout/rules";
import { ORDER_LOOKUP_RATE } from "@/server/services/order-access";

describe("durable rate limit core", () => {
  it("allows requests within the limit", async () => {
    const store = createAtomicMemoryRateLimitStore();
    const key = `ok:${Date.now()}:${Math.random()}`;
    const first = await checkRateLimit(
      { key, limit: 3, windowMs: 60_000, now: 1_000 },
      store,
    );
    const second = await checkRateLimit(
      { key, limit: 3, windowMs: 60_000, now: 1_000 },
      store,
    );
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 1);
  });

  it("enforces the limit", async () => {
    const store = createAtomicMemoryRateLimitStore();
    const key = `deny:${Date.now()}:${Math.random()}`;
    let denied = false;
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(
        { key, limit: 3, windowMs: 60_000, now: 5_000 },
        store,
      );
      if (!result.allowed) denied = true;
    }
    assert.equal(denied, true);
  });

  it("expired windows no longer block", async () => {
    const store = createAtomicMemoryRateLimitStore();
    const key = `exp:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      await checkRateLimit({ key, limit: 3, windowMs: 60_000, now: 0 }, store);
    }
    const later = await checkRateLimit(
      { key, limit: 3, windowMs: 60_000, now: 60_000 },
      store,
    );
    assert.equal(later.allowed, true);
    assert.equal(
      rateLimitWindowStart(0, 60_000).getTime() ===
        rateLimitWindowStart(60_000, 60_000).getTime(),
      false,
    );
  });

  it("isolates different identities", async () => {
    const store = createAtomicMemoryRateLimitStore();
    const now = 10_000;
    for (let i = 0; i < 4; i++) {
      await checkRateLimit(
        { key: "checkout:email:a@x.com", limit: 3, windowMs: 60_000, now },
        store,
      );
    }
    const other = await checkRateLimit(
      { key: "checkout:email:b@x.com", limit: 3, windowMs: 60_000, now },
      store,
    );
    assert.equal(other.allowed, true);
    assert.notEqual(
      hashedRateLimitKey("checkout:email:a@x.com"),
      hashedRateLimitKey("checkout:email:b@x.com"),
    );
  });

  it("serializes concurrent increments so they cannot trivially bypass", async () => {
    const store = createAtomicMemoryRateLimitStore();
    const key = `conc:${Date.now()}:${Math.random()}`;
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        checkRateLimit({ key, limit: 5, windowMs: 60_000, now: 20_000 }, store),
      ),
    );
    const allowed = results.filter((result) => result.allowed).length;
    assert.equal(allowed, 5);
    assert.equal(results.filter((result) => !result.allowed).length, 15);
  });

  it("hashes storage keys instead of persisting raw emails", () => {
    const raw = "checkout:email:guest@example.com";
    const hashed = hashedRateLimitKey(raw);
    assert.equal(hashed.includes("guest@example.com"), false);
    assert.equal(hashed.length, 64);
  });

  it("computes retry-after from the window", () => {
    const windowStart = rateLimitWindowStart(1_000, 60_000);
    const result = evaluateRateLimitHit({
      count: 9,
      limit: 8,
      windowStart,
      windowMs: 60_000,
      now: 1_000,
    });
    assert.equal(result.allowed, false);
    assert.ok(result.retryAfterSeconds >= 1);
  });

  it("keeps checkout window semantics", () => {
    assert.equal(CHECKOUT_RATE_LIMIT.email.limit, 8);
    assert.equal(CHECKOUT_RATE_LIMIT.ip.limit, 12);
    assert.equal(CHECKOUT_RATE_LIMIT.email.windowMs, 15 * 60_000);
  });

  it("keeps order-access lookup windows", () => {
    assert.equal(ORDER_LOOKUP_RATE.limit, 40);
    assert.equal(ORDER_LOOKUP_RATE.windowMs, 15 * 60_000);
  });

  it("stores hashed keys rather than depending on a process-local Map", async () => {
    const seen: string[] = [];
    const store: RateLimitStore = {
      async increment(key) {
        seen.push(key);
        return 1;
      },
      async pruneExpired() {},
    };
    await checkRateLimit(
      { key: "auth:login:guest@example.com", limit: 3, windowMs: 60_000, now: 0 },
      store,
    );
    assert.equal(seen.length, 1);
    assert.equal(seen[0], hashedRateLimitKey("auth:login:guest@example.com"));
    assert.equal(seen[0].includes("@"), false);
  });

  it("sets Retry-After without exposing internals", () => {
    const headers = rateLimitRetryAfterHeader({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 42,
    });
    assert.equal(headers["Retry-After"], "42");
  });

  it("checkout, auth reset, and analytics use durable checkRateLimit", () => {
    const root = join(import.meta.dirname, "..");
    const checkout = readFileSync(
      join(root, "server/actions/checkout.ts"),
      "utf8",
    );
    const reset = readFileSync(
      join(root, "server/actions/password-reset.ts"),
      "utf8",
    );
    const register = readFileSync(join(root, "server/actions/auth.ts"), "utf8");
    const analytics = readFileSync(
      join(root, "app/api/analytics/event/route.ts"),
      "utf8",
    );
    const orderPage = readFileSync(
      join(root, "app/[locale]/order/[number]/page.tsx"),
      "utf8",
    );
    const contact = readFileSync(
      join(root, "server/actions/contact.ts"),
      "utf8",
    );
    assert.equal(checkout.includes("checkRateLimit"), true);
    assert.equal(checkout.includes("CHECKOUT_RATE_LIMIT"), true);
    assert.equal(reset.includes("checkRateLimit"), true);
    assert.equal(register.includes("auth:register:"), true);
    assert.equal(contact.includes("checkRateLimit"), true);
    assert.equal(analytics.includes("new Map"), false);
    assert.equal(analytics.includes("checkRateLimit"), true);
    assert.equal(orderPage.includes('status === "rate_limited"'), true);
    assert.equal(orderPage.includes("notFound()"), true);
  });
});
