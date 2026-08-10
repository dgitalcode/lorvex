"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export type AuditLogRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userEmail: string | null;
  ip: string | null;
  createdAt: string;
};

export function AuditLogsTable({ data }: { data: AuditLogRow[] }) {
  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      { accessorKey: "action", header: "Action" },
      { accessorKey: "entity", header: "Entity" },
      { accessorKey: "entityId", header: "Entity ID" },
      {
        accessorKey: "userEmail",
        header: "User",
        cell: ({ row }) => row.original.userEmail ?? "System",
      },
      {
        accessorKey: "ip",
        header: "IP",
        cell: ({ row }) => row.original.ip ?? "—",
      },
      {
        id: "status",
        header: "",
        cell: () => <Badge variant="muted">Logged</Badge>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="System"
        title="Audit logs"
        description="Immutable trail of admin actions across catalog, commerce and platform settings."
      />
      <DataTable
        columns={columns}
        data={data}
        searchKey="action"
        searchPlaceholder="Search by action…"
        emptyMessage="No audit entries yet."
        pageSize={25}
      />
    </div>
  );
}
