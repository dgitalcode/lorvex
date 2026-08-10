import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import {
  isStaffRole,
  roleHasPermission,
  type PermissionKey,
} from "@/server/auth/permissions";

export type AdminSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

export async function requireAdminSession(): Promise<AdminSessionUser> {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    redirect("/fr/auth/sign-in?callbackUrl=/admin");
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role as Role,
  };
}

export async function requirePermission(
  permission: PermissionKey,
): Promise<AdminSessionUser> {
  const user = await requireAdminSession();
  if (!roleHasPermission(user.role, permission)) {
    redirect("/admin?error=forbidden");
  }
  return user;
}

export async function assertPermission(permission: PermissionKey) {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    throw new Error("UNAUTHORIZED");
  }
  if (!roleHasPermission(session.user.role as Role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role as Role,
  } satisfies AdminSessionUser;
}
