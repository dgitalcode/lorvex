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
import { formatDate } from "@/lib/format";
import { createPopup, togglePopup, updatePopup } from "@/server/actions/admin/marketing";

export type AdminPopupRow = {
  id: string;
  name: string;
  trigger: string;
  content: { title: string; body: string; ctaLabel?: string | null; ctaUrl?: string | null };
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  trigger: "EXIT_INTENT" | "DELAY" | "SCROLL" | "IMMEDIATE";
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  trigger: "DELAY",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export function PopupsManager({ popups }: { popups: AdminPopupRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);

  const columns = useMemo<ColumnDef<AdminPopupRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        id: "title",
        header: "Title",
        cell: ({ row }) => row.original.content.title,
      },
      { accessorKey: "trigger", header: "Trigger" },
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setForm({
                  id: row.original.id,
                  name: row.original.name,
                  title: row.original.content.title,
                  body: row.original.content.body,
                  ctaLabel: row.original.content.ctaLabel ?? "",
                  ctaUrl: row.original.content.ctaUrl ?? "",
                  trigger: row.original.trigger as FormState["trigger"],
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
                  const result = await togglePopup({
                    id: row.original.id,
                    isActive: !row.original.isActive,
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(row.original.isActive ? "Popup deactivated" : "Popup activated");
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
              name: form.name,
              content: {
                title: form.title,
                body: form.body,
                ctaLabel: form.ctaLabel || null,
                ctaUrl: form.ctaUrl || null,
              },
              trigger: form.trigger,
              startsAt: form.startsAt ? new Date(form.startsAt) : null,
              endsAt: form.endsAt ? new Date(form.endsAt) : null,
              isActive: form.isActive,
            };
            const result = form.id
              ? await updatePopup({ ...payload, id: form.id })
              : await createPopup(payload);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(form.id ? "Popup updated" : "Popup created");
            setForm(emptyForm);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-xl">{form.id ? "Edit popup" : "New popup"}</h2>
        <div className="space-y-2">
          <Label htmlFor="popup-name">Name</Label>
          <Input
            id="popup-name"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="popup-title">Title</Label>
          <Input
            id="popup-title"
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="popup-body">Body</Label>
          <Textarea
            id="popup-body"
            rows={4}
            value={form.body}
            onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="popup-cta-label">CTA label</Label>
            <Input
              id="popup-cta-label"
              value={form.ctaLabel}
              onChange={(e) => setForm((c) => ({ ...c, ctaLabel: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="popup-cta-url">CTA URL</Label>
            <Input
              id="popup-cta-url"
              type="url"
              value={form.ctaUrl}
              onChange={(e) => setForm((c) => ({ ...c, ctaUrl: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Trigger</Label>
          <Select
            value={form.trigger}
            onValueChange={(value) =>
              setForm((c) => ({ ...c, trigger: value as FormState["trigger"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IMMEDIATE">Immediate</SelectItem>
              <SelectItem value="DELAY">Delay</SelectItem>
              <SelectItem value="SCROLL">Scroll</SelectItem>
              <SelectItem value="EXIT_INTENT">Exit intent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="popup-starts">Starts</Label>
            <Input
              id="popup-starts"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="popup-ends">Ends</Label>
            <Input
              id="popup-ends"
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
            {pending ? "Saving…" : form.id ? "Update popup" : "Create popup"}
          </Button>
          {form.id && (
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <DataTable columns={columns} data={popups} searchKey="name" searchPlaceholder="Search popups…" />
    </div>
  );
}
