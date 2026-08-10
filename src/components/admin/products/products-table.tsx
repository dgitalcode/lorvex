"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice } from "@/lib/format";
import {
  deleteProducts,
  duplicateProduct,
  updateProductStatus,
} from "@/server/actions/admin/products";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
  currency: string;
  basePrice: number;
  brandName: string;
  totalStock: number;
};

const statusVariant: Record<
  AdminProductRow["status"],
  "default" | "accent" | "outline" | "muted"
> = {
  ACTIVE: "accent",
  DRAFT: "muted",
  ARCHIVED: "outline",
  OUT_OF_STOCK: "outline",
};

function StatusBadge({ status }: { status: AdminProductRow["status"] }) {
  return (
    <Badge variant={statusVariant[status]} className="whitespace-nowrap">
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function ProductsTable({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<AdminProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <Link
            href={`/admin/products/${row.original.id}`}
            className="font-medium hover:text-accent"
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "brandName", header: "Brand" },
      {
        accessorKey: "basePrice",
        header: "Price",
        cell: ({ row }) =>
          formatPrice(row.original.basePrice, row.original.currency),
      },
      {
        accessorKey: "totalStock",
        header: "Stock",
        cell: ({ row }) => (
          <span
            className={
              row.original.totalStock <= 3 ? "text-destructive tabular-nums" : "tabular-nums"
            }
          >
            {row.original.totalStock}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/products/${row.original.id}`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending && busyId === row.original.id}
                onClick={() => {
                  setBusyId(row.original.id);
                  startTransition(async () => {
                    const result = await duplicateProduct({ id: row.original.id });
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Product duplicated");
                    router.push(`/admin/products/${result.id}`);
                  });
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={pending && busyId === row.original.id}
                onClick={() => {
                  if (!confirm(`Delete "${row.original.name}"?`)) return;
                  setBusyId(row.original.id);
                  startTransition(async () => {
                    const result = await deleteProducts([row.original.id]);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Product deleted");
                    router.refresh();
                  });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [busyId, pending, router],
  );

  function bulkAction(
    label: string,
    action: (ids: string[]) => Promise<{ ok: boolean; error?: string }>,
  ) {
    function BulkActionButtons(rows: AdminProductRow[]) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await action(rows.map((row) => row.id));
              if (!result.ok) {
                toast.error(result.error ?? "Action failed");
                return;
              }
              toast.success(label);
              router.refresh();
            });
          }}
        >
          {label}
        </Button>
      );
    }
    BulkActionButtons.displayName = `BulkAction(${label})`;
    return BulkActionButtons;
  }

  return (
    <DataTable
      columns={columns}
      data={products}
      searchKey="name"
      searchPlaceholder="Search products…"
      emptyMessage="No products found."
      onBulkAction={(selected) => (
        <>
          {bulkAction("Publish", (ids) =>
            updateProductStatus({ ids, status: "ACTIVE" }),
          )(selected)}
          {bulkAction("Draft", (ids) =>
            updateProductStatus({ ids, status: "DRAFT" }),
          )(selected)}
          {bulkAction("Archive", (ids) =>
            updateProductStatus({ ids, status: "ARCHIVED" }),
          )(selected)}
          <Button
            size="sm"
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete ${selected.length} product(s)?`)) return;
              startTransition(async () => {
                const result = await deleteProducts(selected.map((row) => row.id));
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Products deleted");
                router.refresh();
              });
            }}
          >
            Delete
          </Button>
        </>
      )}
    />
  );
}
