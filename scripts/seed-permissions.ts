import "dotenv/config";
import { PrismaClient, type Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PERMISSIONS,
  permissionsForRole,
  type PermissionKey,
} from "../src/server/auth/permissions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const keys = Object.keys(PERMISSIONS) as PermissionKey[];
  const perms = [];
  for (const key of keys) {
    const row = await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        name: PERMISSIONS[key],
        category: key.split(".")[0] ?? "general",
      },
      update: {
        name: PERMISSIONS[key],
        category: key.split(".")[0] ?? "general",
      },
    });
    perms.push(row);
  }

  const roles: Role[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR",
    "SUPPORT",
    "ANALYST",
  ];

  for (const role of roles) {
    const allowed = new Set(permissionsForRole(role));
    for (const permission of perms) {
      if (!allowed.has(permission.key as PermissionKey)) continue;
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id,
          },
        },
        create: { role, permissionId: permission.id },
        update: {},
      });
    }
  }

  console.log(`Seeded ${perms.length} permissions across ${roles.length} roles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
