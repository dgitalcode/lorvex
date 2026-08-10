"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { createCoupon, toggleCoupon, updateCoupon } from "@/server/actions/admin/marketing";

export type AdminCouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

type FormState = {
  id?: string;
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: 10,
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: 1,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function typeLabel(type: AdminCouponRow["type"]) {
  if (type === "PERCENTAGE") return "Percentage";
  if (type === "FIXED") return "Fixed amount";
  return "Free shipping";
}

function formatValue(row: AdminCouponRow) {
  if (row.type === "PERCENTAGE") return `${row.value}%`;
  if (row.type === "FREE_SHIPPING") return "—";
  return formatPrice(row.value);
}

export function CouponsManager({ coupons }: { coupons: AdminCouponRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);

  const columns = useMemo<ColumnDef<AdminCouponRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => typeLabel(row.original.type),
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => formatValue(row.original),
      },
      {
        id: "usage",
        header: "Usage",
        cell: ({ row }) =>
          `${row.original.usageCount}${row.original.usageLimit ? ` / ${row.original.usageLimit}` : ""}`,
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setForm({
                  id: row.original.id,
                  code: row.original.code,
                  description: row.original.description ?? "",
                  type: row.original.type,
                  value: row.original.value,
                  minOrderAmount: row.original.minOrderAmount?.toString() ?? "",
                  maxDiscount: row.original.maxDiscount?.toString() ?? "",
                  usageLimit: row.original.usageLimit?.toString() ?? "",
                  perUserLimit: row.original.perUserLimit,
                  startsAt: row.original.startsAt?.slice(0, 16) ?? "",
                  endsAt: row.original.endsAt?.slice(0, 16) ?? "",
                  isActive: row.original.isActive,
                })
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  const result = await toggleCoupon({
                    id: row.original.id,
                    isActive: !row.original.isActive,
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(row.original.isActive ? "Coupon deactivated" : "Coupon activated");
                  router.refresh();
                })
              }
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form
        className="space-y-4 border border-border p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const payload = {
              code: form.code.toUpperCase(),
              description: form.description || null,
              type: form.type,
              value: form.value,
              minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
              maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
              usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
              perUserLimit: form.perUserLimit,
              startsAt: form.startsAt ? new Date(form.startsAt) : null,
              endsAt: form.endsAt ? new Date(form.endsAt) : null,
              isActive: form.isActive,
            };
            const result = form.id
              ? await updateCoupon({ ...payload, id: form.id })
              : await createCoupon(payload);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(form.id ? "Coupon updated" : "Coupon created");
            setForm(emptyForm);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-xl">{form.id ? "Edit coupon" : "New coupon"}</h2>
        <div className="space-y-2">
          <Label htmlFor="coupon-code">Code</Label>
          <Input
            id="coupon-code"
            value={form.code}
            onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm((c) => ({
                ...c,
                type: value as FormState["type"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED">Fixed amount</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.type !== "FREE_SHIPPING" && (
          <div className="space-y-2">
            <Label htmlFor="coupon-value">Value</Label>
            <Input
              id="coupon-value"
              type="number"
              min={0}
              step={form.type === "PERCENTAGE" ? 1 : 0.01}
              value={form.value}
              onChange={(e) => setForm((c) => ({ ...c, value: Number(e.target.value) }))}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="coupon-description">Description</Label>
          <Textarea
            id="coupon-description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="coupon-min">Min order</Label>
            <Input
              id="coupon-min"
              type="number"
              min={0}
              value={form.minOrderAmount}
              onChange={(e) => setForm((c) => ({ ...c, minOrderAmount: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-max">Max discount</Label>
            <Input
              id="coupon-max"
              type="number"
              min={0}
              value={form.maxDiscount}
              onChange={(e) => setForm((c) => ({ ...c, maxDiscount: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="coupon-limit">Usage limit</Label>
            <Input
              id="coupon-limit"
              type="number"
              min={1}
              value={form.usageLimit}
              onChange={(e) => setForm((c) => ({ ...c, usageLimit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-per-user">Per user</Label>
            <Input
              id="coupon-per-user"
              type="number"
              min={1}
              value={form.perUserLimit}
              onChange={(e) => setForm((c) => ({ ...c, perUserLimit: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="coupon-starts">Starts</Label>
            <Input
              id="coupon-starts"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-ends">Ends</Label>
            <Input
              id="coupon-ends"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))}
            />
          </div>
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
            {pending ? "Saving…" : form.id ? "Update coupon" : "Create coupon"}
          </Button>
          {form.id && (
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <DataTable columns={columns} data={coupons} searchKey="code" searchPlaceholder="Search coupons…" />
    </div>
  );
}
