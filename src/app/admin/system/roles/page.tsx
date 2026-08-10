import { prisma } from "@/lib/prisma";
import { requireAdminSession, requirePermission } from "@/server/auth/require-admin";
import { RolesAccessPanel } from "@/components/admin/system/roles-access-panel";

export const metadata = { title: "Roles & access" };

export default async function AdminRolesPage() {
  await requirePermission("users.manage");
  const currentUser = await requireAdminSession();

  const staffUsers = await prisma.user.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "ADMIN", "EDITOR", "SUPPORT", "ANALYST"] },
      status: "ACTIVE",
    },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return (
    <RolesAccessPanel
      staffUsers={staffUsers.map((user) => ({
        ...user,
        role: user.role as "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "SUPPORT" | "ANALYST",
      }))}
      canEdit={currentUser.role === "SUPER_ADMIN"}
    />
  );
}
