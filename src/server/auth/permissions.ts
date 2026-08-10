import type { Role } from "@prisma/client";

export const PERMISSIONS = {
  "dashboard.view": "View dashboard",
  "products.view": "View products",
  "products.edit": "Create and edit products",
  "products.delete": "Delete products",
  "inventory.manage": "Manage inventory",
  "orders.view": "View orders",
  "orders.manage": "Update order status and fulfillment",
  "orders.refund": "Issue refunds and returns",
  "customers.view": "View customers",
  "customers.manage": "Manage customers, tags and segments",
  "cms.view": "View CMS content",
  "cms.publish": "Publish CMS content",
  "marketing.view": "View marketing",
  "marketing.manage": "Manage marketing campaigns",
  "analytics.view": "View analytics",
  "media.manage": "Manage media library",
  "system.view": "View system health and logs",
  "system.manage": "Manage system settings, backups and roles",
  "users.manage": "Manage staff users and permissions",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as PermissionKey[];

const ROLE_MATRIX: Record<Role, PermissionKey[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "system.manage" && p !== "users.manage").concat([
    "system.view",
  ]),
  EDITOR: [
    "dashboard.view",
    "products.view",
    "products.edit",
    "cms.view",
    "cms.publish",
    "media.manage",
    "analytics.view",
  ],
  SUPPORT: [
    "dashboard.view",
    "orders.view",
    "orders.manage",
    "orders.refund",
    "customers.view",
    "customers.manage",
    "products.view",
  ],
  ANALYST: ["dashboard.view", "analytics.view", "products.view", "orders.view", "customers.view"],
  CUSTOMER: [],
};

export function permissionsForRole(role: Role): PermissionKey[] {
  return ROLE_MATRIX[role] ?? [];
}

export function roleHasPermission(role: Role, permission: PermissionKey): boolean {
  return permissionsForRole(role).includes(permission);
}

export function isStaffRole(role: Role | string | undefined | null): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "EDITOR" ||
    role === "SUPPORT" ||
    role === "ANALYST"
  );
}
