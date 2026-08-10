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
import { createCollection, updateCollection } from "@/server/actions/admin/catalog";

export type AdminCollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isLimited: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productCount: number;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  coverUrl: string;
  isLimited: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  coverUrl: "",
  isLimited: false,
  isFeatured: false,
  sortOrder: 0,
};

export function CollectionsManager({
  collections,
}: {
  collections: AdminCollectionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);

  const columns = useMemo<ColumnDef<AdminCollectionRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "slug", header: "Slug" },
      {
        accessorKey: "productCount",
        header: "Products",
        cell: ({ row }) => row.original.productCount.toLocaleString("fr-MA"),
      },
      {
        accessorKey: "isLimited",
        header: "Limited",
        cell: ({ row }) =>
          row.original.isLimited ? <Badge variant="accent">Yes</Badge> : <Badge variant="muted">No</Badge>,
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
                coverUrl: row.original.coverUrl ?? "",
                isLimited: row.original.isLimited,
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
              coverUrl: form.coverUrl || null,
              isLimited: form.isLimited,
              isFeatured: form.isFeatured,
              sortOrder: form.sortOrder,
            };
            const result = form.id
              ? await updateCollection({ ...payload, id: form.id })
              : await createCollection(payload);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(form.id ? "Collection updated" : "Collection created");
            setForm(emptyForm);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-xl">
          {form.id ? "Edit collection" : "New collection"}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="collection-name">Name</Label>
          <Input
            id="collection-name"
            value={form.name}
            onChange={(event) => {
              updateField("name", event.target.value);
              if (!form.id) updateField("slug", slugify(event.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-slug">Slug</Label>
          <Input
            id="collection-slug"
            value={form.slug}
            onChange={(event) => updateField("slug", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-cover">Cover URL</Label>
          <Input
            id="collection-cover"
            value={form.coverUrl}
            onChange={(event) => updateField("coverUrl", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-description">Description</Label>
          <Textarea
            id="collection-description"
            rows={4}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-sort">Sort order</Label>
          <Input
            id="collection-sort"
            type="number"
            value={form.sortOrder}
            onChange={(event) => updateField("sortOrder", Number(event.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isLimited}
            onCheckedChange={(checked) => updateField("isLimited", Boolean(checked))}
          />
          Limited collection
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isFeatured}
            onCheckedChange={(checked) => updateField("isFeatured", Boolean(checked))}
          />
          Featured on storefront
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : form.id ? "Update collection" : "Create collection"}
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
        data={collections}
        searchKey="name"
        searchPlaceholder="Search collections…"
      />
    </div>
  );
}
