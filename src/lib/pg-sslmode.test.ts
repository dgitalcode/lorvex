import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withExplicitVerifyFullSsl } from "./pg-sslmode";

describe("pg sslmode", () => {
  it("rewrites require/prefer/verify-ca to verify-full without touching the rest of the URL", () => {
    assert.equal(
      withExplicitVerifyFullSsl("postgresql://u:p@host/db?sslmode=require"),
      "postgresql://u:p@host/db?sslmode=verify-full",
    );
    assert.equal(
      withExplicitVerifyFullSsl("postgresql://u:p@host/db?connect_timeout=10&sslmode=prefer"),
      "postgresql://u:p@host/db?connect_timeout=10&sslmode=verify-full",
    );
    assert.equal(
      withExplicitVerifyFullSsl("postgresql://u:p@host/db?sslmode=verify-ca&foo=1"),
      "postgresql://u:p@host/db?sslmode=verify-full&foo=1",
    );
  });

  it("leaves verify-full and missing sslmode unchanged", () => {
    const already = "postgresql://u:p@host/db?sslmode=verify-full";
    assert.equal(withExplicitVerifyFullSsl(already), already);
    const none = "postgresql://u:p@host/db";
    assert.equal(withExplicitVerifyFullSsl(none), none);
  });
});
