"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { UserStatus } from "@prisma/client";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/format";

export type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  orderCount: number;
  ltv: number;
  currency: string;
};

const columns: ColumnDef<AdminCustomerRow>[] = [
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => (
      <Link
        href={`/admin/customers/${row.original.id}`}
        className="font-medium hover:text-accent"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "orderCount",
    header: "Orders",
  },
  {
    accessorKey: "ltv",
    header: "LTV",
    cell: ({ row }) =>
      formatPrice(row.original.ltv, row.original.currency),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "ACTIVE" ? "outline" : "muted"}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];

export function CustomersTable({ data }: { data: AdminCustomerRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="email"
      searchPlaceholder="Search customers…"
      emptyMessage="No customers found."
    />
  );
}
