import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldUseSecureAuthCookie } from "./auth-session-cookie";

describe("Auth.js secure session cookie on Vercel", () => {
  it("uses the __Secure- cookie when the forwarded proto is https", () => {
    const headers = new Headers({ "x-forwarded-proto": "https" });
    assert.equal(shouldUseSecureAuthCookie(headers), true);
  });

  it("uses the __Secure- cookie when proto is a forwarded list starting with https", () => {
    const headers = new Headers({ "x-forwarded-proto": "https,http" });
    assert.equal(shouldUseSecureAuthCookie(headers), true);
  });

  it("does not force a secure cookie on plain http forwarding", () => {
    const headers = new Headers({ "x-forwarded-proto": "http" });
    assert.equal(shouldUseSecureAuthCookie(headers), false);
  });
});
