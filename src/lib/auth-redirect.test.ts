import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultPostLoginPath,
  isAdminRouteAuthorized,
  resolvePostLoginPath,
  sanitizeCallbackUrl,
} from "./auth-redirect";

describe("post-login redirect routing", () => {
  it("1) Admin login → /admin", () => {
    assert.equal(
      resolvePostLoginPath({ role: "SUPER_ADMIN", locale: "fr" }),
      "/admin",
    );
    assert.equal(resolvePostLoginPath({ role: "ADMIN", locale: "en" }), "/admin");
    assert.equal(defaultPostLoginPath("EDITOR", "ar"), "/admin");
  });

  it("2) Customer login → /account (locale-aware)", () => {
    assert.equal(
      resolvePostLoginPath({ role: "CUSTOMER", locale: "fr" }),
      "/fr/account",
    );
    assert.equal(
      resolvePostLoginPath({ role: "CUSTOMER", locale: "en" }),
      "/en/account",
    );
    assert.equal(
      resolvePostLoginPath({ role: "CUSTOMER", locale: "ar" }),
      "/ar/account",
    );
  });

  it("3) Unauthenticated / missing role → customer account fallback", () => {
    assert.equal(resolvePostLoginPath({ role: undefined, locale: "fr" }), "/fr/account");
    assert.equal(isAdminRouteAuthorized(null), false);
    assert.equal(isAdminRouteAuthorized({ user: null }), false);
  });

  it("4) Customer accessing /admin callback → denied (account fallback)", () => {
    assert.equal(
      resolvePostLoginPath({
        role: "CUSTOMER",
        locale: "fr",
        callbackUrl: "/admin",
      }),
      "/fr/account",
    );
    assert.equal(
      resolvePostLoginPath({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/admin/products",
      }),
      "/en/account",
    );
    assert.equal(isAdminRouteAuthorized({ user: { role: "CUSTOMER" } }), false);
  });

  it("5) Admin accessing /admin → allowed", () => {
    assert.equal(isAdminRouteAuthorized({ user: { role: "SUPER_ADMIN" } }), true);
    assert.equal(isAdminRouteAuthorized({ user: { role: "ADMIN" } }), true);
    assert.equal(
      resolvePostLoginPath({
        role: "SUPER_ADMIN",
        locale: "fr",
        callbackUrl: "/admin",
      }),
      "/admin",
    );
  });

  it("6) Admin refreshing /admin callback → remains authorized path", () => {
    assert.equal(
      resolvePostLoginPath({
        role: "SUPER_ADMIN",
        locale: "fr",
        callbackUrl: "/admin/orders",
      }),
      "/admin/orders",
    );
    assert.equal(isAdminRouteAuthorized({ user: { role: "SUPPORT" } }), true);
  });

  it("7) Admin opening /admin directly → allowed", () => {
    assert.equal(defaultPostLoginPath("ANALYST", "fr"), "/admin");
    assert.equal(isAdminRouteAuthorized({ user: { role: "ANALYST" } }), true);
  });

  it("8) Admin logout / cleared session → authentication required", () => {
    assert.equal(isAdminRouteAuthorized(undefined), false);
    assert.equal(isAdminRouteAuthorized({}), false);
    assert.equal(resolvePostLoginPath({ role: null, locale: "fr" }), "/fr/account");
  });

  it("9) Expired / empty session role → not authorized for admin", () => {
    assert.equal(isAdminRouteAuthorized({ user: { role: undefined } }), false);
    assert.equal(isAdminRouteAuthorized({ user: {} }), false);
  });

  it("honors safe non-admin callback URLs for customers", () => {
    assert.equal(
      resolvePostLoginPath({
        role: "CUSTOMER",
        locale: "fr",
        callbackUrl: "/fr/cart",
      }),
      "/fr/cart",
    );
  });

  it("rejects open-redirect callback URLs", () => {
    assert.equal(sanitizeCallbackUrl("https://evil.example/phish"), null);
    assert.equal(sanitizeCallbackUrl("//evil.example"), null);
    assert.equal(sanitizeCallbackUrl("\\\\evil"), null);
    assert.equal(sanitizeCallbackUrl("account"), null);
    assert.equal(sanitizeCallbackUrl("/fr/account"), "/fr/account");
  });
});
