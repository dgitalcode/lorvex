import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  permissionsForRole,
  roleHasPermission,
  isStaffRole,
} from "./permissions";

describe("admin permissions", () => {
  it("grants SUPER_ADMIN full access", () => {
    const perms = permissionsForRole("SUPER_ADMIN");
    assert.ok(perms.includes("system.manage"));
    assert.ok(perms.includes("users.manage"));
    assert.ok(roleHasPermission("SUPER_ADMIN", "orders.refund"));
  });

  it("restricts ANALYST to read-only surfaces", () => {
    assert.equal(roleHasPermission("ANALYST", "analytics.view"), true);
    assert.equal(roleHasPermission("ANALYST", "products.edit"), false);
    assert.equal(roleHasPermission("ANALYST", "system.manage"), false);
  });

  it("treats only staff roles as staff", () => {
    assert.equal(isStaffRole("ADMIN"), true);
    assert.equal(isStaffRole("CUSTOMER"), false);
    assert.equal(isStaffRole(undefined), false);
  });
});
