"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReturnStatus } from "@prisma/client";
import { DataTable } from "@/components/admin/data-table";
import { formatDate } from "@/lib/format";
import { ReturnStatusSelect } from "@/components/admin/orders/order-detail-actions";

export type AdminReturnRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  email: string;
  reason: string;
  status: ReturnStatus;
  itemSummary: string;
  createdAt: string;
};

const columns: ColumnDef<AdminReturnRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.orderId}`}
        className="font-medium hover:text-accent"
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: "email",
    header: "Customer",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "itemSummary",
    header: "Items",
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate">{row.original.reason}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <ReturnStatusSelect
        returnId={row.original.id}
        current={row.original.status}
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Requested",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];

export function ReturnsTable({ data }: { data: AdminReturnRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="orderNumber"
      searchPlaceholder="Search by order #…"
      emptyMessage="No return requests."
    />
  );
}
