"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS, permissionsForRole } from "@/server/auth/permissions";
import { updateStaffRole } from "@/server/actions/admin/system";

type StaffRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "SUPPORT" | "ANALYST";

export type StaffUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: StaffRole;
};

const STAFF_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "SUPPORT",
  "ANALYST",
];

export function RolesAccessPanel({
  staffUsers,
  canEdit,
}: {
  staffUsers: StaffUserRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const permissionKeys = useMemo(
    () => Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[],
    [],
  );

  const columns = useMemo<ColumnDef<StaffUserRow>[]>(
    () => [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          if (!canEdit) {
            return <Badge variant="outline">{row.original.role}</Badge>;
          }
          return (
            <Select
              defaultValue={row.original.role}
              disabled={pending}
              onValueChange={(value) => {
                startTransition(async () => {
                  const result = await updateStaffRole({
                    userId: row.original.id,
                    role: value as StaffRole,
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Role updated.");
                  router.refresh();
                });
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
    ],
    [canEdit, pending, router],
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="System"
        title="Roles & access"
        description="Runtime permission matrix and staff role assignments."
      />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Permission</th>
              {STAFF_ROLES.map((role) => (
                <th key={role} className="px-3 py-3 text-center">
                  {role.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {permissionKeys.map((key) => (
              <tr key={key}>
                <td className="px-4 py-3">
                  <p className="font-medium">{PERMISSIONS[key]}</p>
                  <p className="text-xs text-muted-foreground">{key}</p>
                </td>
                {STAFF_ROLES.map((role) => {
                  const allowed = permissionsForRole(role).includes(key);
                  return (
                    <td key={`${key}-${role}`} className="px-3 py-3 text-center">
                      {allowed ? (
                        <Badge variant="accent">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Staff users</h2>
          {!canEdit && (
            <Badge variant="outline">Read-only — super admin required to edit</Badge>
          )}
        </div>
        <DataTable
          columns={columns}
          data={staffUsers}
          searchKey="email"
          searchPlaceholder="Search staff by email…"
          emptyMessage="No staff users found."
        />
      </div>
    </div>
  );
}
