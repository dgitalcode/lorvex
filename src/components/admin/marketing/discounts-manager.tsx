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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatPrice } from "@/lib/format";
import { createDiscountRule, updateDiscountRule } from "@/server/actions/admin/marketing";

export type AdminDiscountRuleRow = {
  id: string;
  name: string;
  type: string;
  value: number;
  stackable: boolean;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING" | "BUNDLE";
  value: number;
  conditions: string;
  stackable: boolean;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  type: "PERCENTAGE",
  value: 10,
  conditions: "",
  stackable: false,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function formatRuleValue(row: AdminDiscountRuleRow) {
  if (row.type === "PERCENTAGE") return `${row.value}%`;
  if (row.type === "FREE_SHIPPING") return "Free shipping";
  return formatPrice(row.value);
}

export function DiscountsManager({ rules }: { rules: AdminDiscountRuleRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);

  const columns = useMemo<ColumnDef<AdminDiscountRuleRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => formatRuleValue(row.original),
      },
      {
        accessorKey: "stackable",
        header: "Stackable",
        cell: ({ row }) => (row.original.stackable ? "Yes" : "No"),
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
        id: "window",
        header: "Schedule",
        cell: ({ row }) => {
          if (!row.original.startsAt && !row.original.endsAt) return "Always";
          return `${row.original.startsAt ? formatDate(row.original.startsAt) : "—"} → ${row.original.endsAt ? formatDate(row.original.endsAt) : "—"}`;
        },
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
                name: row.original.name,
                type: row.original.type as FormState["type"],
                value: row.original.value,
                conditions: "",
                stackable: row.original.stackable,
                startsAt: row.original.startsAt?.slice(0, 16) ?? "",
                endsAt: row.original.endsAt?.slice(0, 16) ?? "",
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
            let conditions: Record<string, unknown> | null = null;
            if (form.conditions.trim()) {
              try {
                conditions = JSON.parse(form.conditions) as Record<string, unknown>;
              } catch {
                toast.error("Conditions must be valid JSON.");
                return;
              }
            }
            const payload = {
              name: form.name,
              type: form.type,
              value: form.value,
              conditions,
              stackable: form.stackable,
              startsAt: form.startsAt ? new Date(form.startsAt) : null,
              endsAt: form.endsAt ? new Date(form.endsAt) : null,
              isActive: form.isActive,
            };
            const result = form.id
              ? await updateDiscountRule({ ...payload, id: form.id })
              : await createDiscountRule(payload);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(form.id ? "Discount rule updated" : "Discount rule created");
            setForm(emptyForm);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-xl">
          {form.id ? "Edit discount rule" : "New discount rule"}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="rule-name">Name</Label>
          <Input
            id="rule-name"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm((c) => ({ ...c, type: value as FormState["type"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED">Fixed amount</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
              <SelectItem value="BUNDLE">Bundle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.type !== "FREE_SHIPPING" && (
          <div className="space-y-2">
            <Label htmlFor="rule-value">Value</Label>
            <Input
              id="rule-value"
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm((c) => ({ ...c, value: Number(e.target.value) }))}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="rule-conditions">Conditions (JSON)</Label>
          <Textarea
            id="rule-conditions"
            rows={4}
            value={form.conditions}
            onChange={(e) => setForm((c) => ({ ...c, conditions: e.target.value }))}
            placeholder='{"minItems":2,"collectionId":"..."}'
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="rule-starts">Starts</Label>
            <Input
              id="rule-starts"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-ends">Ends</Label>
            <Input
              id="rule-ends"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.stackable}
            onCheckedChange={(checked) => setForm((c) => ({ ...c, stackable: Boolean(checked) }))}
          />
          Stackable with other rules
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isActive}
            onCheckedChange={(checked) => setForm((c) => ({ ...c, isActive: Boolean(checked) }))}
          />
          Active
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : form.id ? "Update rule" : "Create rule"}
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
        data={rules}
        searchKey="name"
        searchPlaceholder="Search discount rules…"
      />
    </div>
  );
}
