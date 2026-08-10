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
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { createBrand, updateBrand } from "@/server/actions/admin/catalog";

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  isFeatured: boolean;
  sortOrder: number;
  productCount: number;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  country: string;
  isFeatured: boolean;
  sortOrder: number;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  country: "",
  isFeatured: false,
  sortOrder: 0,
};

export function BrandsManager({ brands }: { brands: AdminBrandRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);

  const columns = useMemo<ColumnDef<AdminBrandRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "slug", header: "Slug" },
      { accessorKey: "country", header: "Country" },
      {
        accessorKey: "productCount",
        header: "Products",
        cell: ({ row }) => row.original.productCount.toLocaleString("fr-MA"),
      },
      {
        accessorKey: "isFeatured",
        header: "Featured",
        cell: ({ row }) =>
          row.original.isFeatured ? <Badge variant="accent">Yes</Badge> : <Badge variant="muted">No</Badge>,
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
                slug: row.original.slug,
                description: row.original.description ?? "",
                country: row.original.country ?? "",
                isFeatured: row.original.isFeatured,
                sortOrder: row.original.sortOrder,
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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form
        className="space-y-4 border border-border p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const payload = {
              name: form.name,
              slug: form.slug,
              description: form.description || null,
              country: form.country || null,
              isFeatured: form.isFeatured,
              sortOrder: form.sortOrder,
            };
            const result = form.id
              ? await updateBrand({ ...payload, id: form.id })
              : await createBrand(payload);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(form.id ? "Brand updated" : "Brand created");
            setForm(emptyForm);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-xl">{form.id ? "Edit brand" : "New brand"}</h2>
        <div className="space-y-2">
          <Label htmlFor="brand-name">Name</Label>
          <Input
            id="brand-name"
            value={form.name}
            onChange={(event) => {
              updateField("name", event.target.value);
              if (!form.id) updateField("slug", slugify(event.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-slug">Slug</Label>
          <Input
            id="brand-slug"
            value={form.slug}
            onChange={(event) => updateField("slug", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-country">Country</Label>
          <Input
            id="brand-country"
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-description">Description</Label>
          <Textarea
            id="brand-description"
            rows={4}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-sort">Sort order</Label>
          <Input
            id="brand-sort"
            type="number"
            value={form.sortOrder}
            onChange={(event) => updateField("sortOrder", Number(event.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isFeatured}
            onCheckedChange={(checked) => updateField("isFeatured", Boolean(checked))}
          />
          Featured on storefront
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : form.id ? "Update brand" : "Create brand"}
          </Button>
          {form.id && (
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <DataTable columns={columns} data={brands} searchKey="name" searchPlaceholder="Search brands…" />
    </div>
  );
}
