"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatPrice } from "@/lib/format";
import { createGiftCard, updateGiftCard } from "@/server/actions/admin/marketing";

export type AdminGiftCardRow = {
  id: string;
  code: string;
  initialAmount: number;
  balance: number;
  currency: string;
  isActive: boolean;
  expiresAt: string | null;
  ownerEmail: string | null;
};

type FormState = {
  id?: string;
  code: string;
  initialAmount: number;
  balance?: number;
  currency: string;
  expiresAt: string;
  ownerId: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: "",
  initialAmount: 500,
  currency: "MAD",
  expiresAt: "",
  ownerId: "",
  isActive: true,
};

export function GiftCardsManager({ giftCards }: { giftCards: AdminGiftCardRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);

  const columns = useMemo<ColumnDef<AdminGiftCardRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) =>
          formatPrice(row.original.balance, row.original.currency),
      },
      {
        accessorKey: "initialAmount",
        header: "Initial",
        cell: ({ row }) =>
          formatPrice(row.original.initialAmount, row.original.currency),
      },
      {
        accessorKey: "ownerEmail",
        header: "Owner",
        cell: ({ row }) => row.original.ownerEmail ?? "—",
      },
      {
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) =>
          row.original.expiresAt ? formatDate(row.original.expiresAt) : "—",
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="accent">Active</Badge>
          ) : (
            <Badge variant="muted">Inactive</Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setForm({
                id: row.original.id,
                code: row.original.code,
                initialAmount: row.original.initialAmount,
                balance: row.original.balance,
                currency: row.original.currency,
                expiresAt: row.original.expiresAt?.slice(0, 16) ?? "",
                ownerId: "",
                isActive: row.original.isActive,
              })
            }
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form
        className="space-y-4 border border-border p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            if (form.id) {
              const result = await updateGiftCard({
                id: form.id,
                balance: form.balance,
                isActive: form.isActive,
                expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
              });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Gift card updated");
            } else {
              const result = await createGiftCard({
                code: form.code.toUpperCase(),
                initialAmount: form.initialAmount,
                currency: form.currency,
                expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
                ownerId: form.ownerId || null,
              });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Gift card created");
            }
            setForm(emptyForm);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-xl">
          {form.id ? "Edit gift card" : "New gift card"}
        </h2>
        {!form.id && (
          <>
            <div className="space-y-2">
              <Label htmlFor="gc-code">Code</Label>
              <Input
                id="gc-code"
                value={form.code}
                onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc-amount">Initial amount</Label>
              <Input
                id="gc-amount"
                type="number"
                min={1}
                value={form.initialAmount}
                onChange={(e) =>
                  setForm((c) => ({ ...c, initialAmount: Number(e.target.value) }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc-owner">Owner user ID (optional)</Label>
              <Input
                id="gc-owner"
                value={form.ownerId}
                onChange={(e) => setForm((c) => ({ ...c, ownerId: e.target.value }))}
                placeholder="cuid…"
              />
            </div>
          </>
        )}
        {form.id && (
          <div className="space-y-2">
            <Label htmlFor="gc-balance">Balance</Label>
            <Input
              id="gc-balance"
              type="number"
              min={0}
              value={form.balance ?? 0}
              onChange={(e) => setForm((c) => ({ ...c, balance: Number(e.target.value) }))}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="gc-expires">Expires</Label>
          <Input
            id="gc-expires"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isActive}
            onCheckedChange={(checked) => setForm((c) => ({ ...c, isActive: Boolean(checked) }))}
          />
          Active
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : form.id ? "Update gift card" : "Create gift card"}
          </Button>
          {form.id && (
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <DataTable
        columns={columns}
        data={giftCards}
        searchKey="code"
        searchPlaceholder="Search gift cards…"
      />
    </div>
  );
}
