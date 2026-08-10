"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/format";

export type AdminOrderRow = {
  id: string;
  number: string;
  createdAt: string;
  email: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === "DELIVERED"
      ? "accent"
      : status === "CANCELLED" || status === "REFUNDED"
        ? "muted"
        : status === "SHIPPED" || status === "PAID"
          ? "default"
          : "outline";
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const columns: ColumnDef<AdminOrderRow>[] = [
  {
    accessorKey: "number",
    header: "Order",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.id}`}
        className="font-medium hover:text-accent"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Customer",
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    cell: ({ row }) => row.original.itemCount,
  },
  {
    accessorKey: "grandTotal",
    header: "Total",
    cell: ({ row }) =>
      formatPrice(row.original.grandTotal, row.original.currency),
  },
  {
    id: "payment",
    header: "Payment",
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.paymentMethod} · {row.original.paymentStatus}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function OrdersTable({ data }: { data: AdminOrderRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="number"
      searchPlaceholder="Search by order # or email…"
      emptyMessage="No orders found."
    />
  );
}

export { StatusBadge as OrderStatusBadge };
