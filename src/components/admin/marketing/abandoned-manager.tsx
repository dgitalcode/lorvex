"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Camera, Mail } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { EmailConfigBanner } from "@/components/admin/marketing/email-config-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/format";
import {
  sendAbandonedCartReminders,
  snapshotAbandonedCarts,
} from "@/server/actions/admin/marketing";

export type AdminAbandonedCartRow = {
  id: string;
  email: string | null;
  itemCount: number;
  total: number;
  currency: string;
  recovered: boolean;
  remindedAt: string | null;
  createdAt: string;
};

type Props = {
  snapshots: AdminAbandonedCartRow[];
  emailStatus: { configured: boolean; from: string; missing: string[] };
};

export function AbandonedManager({ snapshots, emailStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const columns = useMemo<ColumnDef<AdminAbandonedCartRow>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ?? "—",
      },
      {
        accessorKey: "itemCount",
        header: "Items",
        cell: ({ row }) => row.original.itemCount.toLocaleString("fr-MA"),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatPrice(row.original.total, row.original.currency),
      },
      {
        accessorKey: "recovered",
        header: "Recovered",
        cell: ({ row }) =>
          row.original.recovered ? (
            <Badge variant="accent">Yes</Badge>
          ) : (
            <Badge variant="muted">No</Badge>
          ),
      },
      {
        accessorKey: "remindedAt",
        header: "Reminded",
        cell: ({ row }) =>
          row.original.remindedAt ? formatDate(row.original.remindedAt) : "—",
      },
      {
        accessorKey: "createdAt",
        header: "Snapshot",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <EmailConfigBanner status={emailStatus} />

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await snapshotAbandonedCarts();
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(`Snapshotted ${result.count ?? 0} abandoned carts`);
              router.refresh();
            })
          }
        >
          <Camera className="mr-2 h-4 w-4" />
          Snapshot abandoned carts
        </Button>
        <Button
          disabled={pending || !emailStatus.configured}
          title={
            emailStatus.configured
              ? "Send reminder emails"
              : "Configure RESEND_API_KEY first"
          }
          onClick={() =>
            startTransition(async () => {
              const result = await sendAbandonedCartReminders();
              if (!result.ok) {
                if (result.reason === "NOT_CONFIGURED") {
                  toast.error("Email is not configured (RESEND_API_KEY missing).");
                } else {
                  toast.error(result.error);
                }
                return;
              }
              toast.success(`Sent ${result.count ?? 0} reminder emails`);
              router.refresh();
            })
          }
        >
          <Mail className="mr-2 h-4 w-4" />
          Send reminders
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={snapshots}
        searchKey="email"
        searchPlaceholder="Search by email…"
        emptyMessage="No abandoned cart snapshots. Run snapshot to scan active carts."
      />
    </div>
  );
}
