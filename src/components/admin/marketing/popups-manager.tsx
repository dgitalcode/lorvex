"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { MarketingPopupDialog } from "@/components/storefront/marketing-popup-dialog";
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
import type { Locale } from "@/config/site";
import { formatDate } from "@/lib/format";
import {
  parsePageTargets,
  type PopupAudience,
  type PopupContent,
  type PopupDevice,
  type PopupEligiblePayload,
  type PopupFrequency,
  type PopupLocaleTarget,
  type PopupPageTarget,
  type PopupTrigger,
} from "@/lib/marketing-popup";
import {
  createPopup,
  togglePopup,
  updatePopup,
} from "@/server/actions/admin/marketing";

export type AdminPopupRow = {
  id: string;
  name: string;
  trigger: string;
  delaySeconds: number | null;
  scrollPercent: number | null;
  pageTargets: PopupPageTarget[];
  localeTarget: string;
  deviceTarget: string;
  audience: string;
  frequency: string;
  priority: number;
  imageUrl: string | null;
  content: PopupContent;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  impressions: number;
  clicks: number;
  dismissals: number;
};

type FormState = {
  id?: string;
  name: string;
  frTitle: string;
  frBody: string;
  frCta: string;
  enTitle: string;
  enBody: string;
  enCta: string;
  arTitle: string;
  arBody: string;
  arCta: string;
  ctaUrl: string;
  imageUrl: string;
  trigger: PopupTrigger;
  delaySeconds: string;
  scrollPercent: string;
  pageTargets: PopupPageTarget[];
  localeTarget: PopupLocaleTarget;
  deviceTarget: PopupDevice;
  audience: PopupAudience;
  frequency: PopupFrequency;
  priority: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  frTitle: "",
  frBody: "",
  frCta: "",
  enTitle: "",
  enBody: "",
  enCta: "",
  arTitle: "",
  arBody: "",
  arCta: "",
  ctaUrl: "",
  imageUrl: "",
  trigger: "DELAY",
  delaySeconds: "8",
  scrollPercent: "50",
  pageTargets: ["ALL"],
  localeTarget: "all",
  deviceTarget: "ALL",
  audience: "ALL",
  frequency: "ONCE_PER_SESSION",
  priority: "50",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function rowToForm(row: AdminPopupRow): FormState {
  return {
    id: row.id,
    name: row.name,
    frTitle: row.content.fr?.title ?? row.content.title ?? "",
    frBody: row.content.fr?.body ?? row.content.body ?? "",
    frCta: row.content.fr?.ctaLabel ?? row.content.ctaLabel ?? "",
    enTitle: row.content.en?.title ?? "",
    enBody: row.content.en?.body ?? "",
    enCta: row.content.en?.ctaLabel ?? "",
    arTitle: row.content.ar?.title ?? "",
    arBody: row.content.ar?.body ?? "",
    arCta: row.content.ar?.ctaLabel ?? "",
    ctaUrl: row.content.ctaUrl ?? "",
    imageUrl: row.imageUrl ?? "",
    trigger: (row.trigger as PopupTrigger) || "DELAY",
    delaySeconds: String(row.delaySeconds ?? 8),
    scrollPercent: String(row.scrollPercent ?? 50),
    pageTargets: parsePageTargets(row.pageTargets),
    localeTarget: (row.localeTarget as PopupLocaleTarget) || "all",
    deviceTarget: (row.deviceTarget as PopupDevice) || "ALL",
    audience: (row.audience as PopupAudience) || "ALL",
    frequency: (row.frequency as PopupFrequency) || "ONCE_PER_SESSION",
    priority: String(row.priority ?? 50),
    startsAt: row.startsAt?.slice(0, 16) ?? "",
    endsAt: row.endsAt?.slice(0, 16) ?? "",
    isActive: row.isActive,
  };
}

function formPayload(form: FormState) {
  return {
    name: form.name,
    content: {
      fr: { title: form.frTitle, body: form.frBody, ctaLabel: form.frCta || null },
      en: { title: form.enTitle, body: form.enBody, ctaLabel: form.enCta || null },
      ar: { title: form.arTitle, body: form.arBody, ctaLabel: form.arCta || null },
      ctaUrl: form.ctaUrl || null,
    },
    trigger: form.trigger,
    delaySeconds: form.delaySeconds ? Number(form.delaySeconds) : null,
    scrollPercent: form.scrollPercent ? Number(form.scrollPercent) : null,
    pageTargets: form.pageTargets,
    localeTarget: form.localeTarget,
    deviceTarget: form.deviceTarget,
    audience: form.audience,
    frequency: form.frequency,
    priority: Number(form.priority) || 50,
    imageUrl: form.imageUrl || null,
    startsAt: form.startsAt ? new Date(form.startsAt) : null,
    endsAt: form.endsAt ? new Date(form.endsAt) : null,
    isActive: form.isActive,
  };
}

const PAGE_OPTIONS: { value: PopupPageTarget; label: string }[] = [
  { value: "ALL", label: "All public pages" },
  { value: "HOME", label: "Homepage" },
  { value: "SHOP", label: "Shop" },
  { value: "COLLECTION", label: "Collections" },
  { value: "PRODUCT", label: "Product" },
  { value: "OTHER", label: "Other public pages" },
];

export function PopupsManager({ popups }: { popups: AdminPopupRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [previewLocale, setPreviewLocale] = useState<Locale>("fr");
  const [previewMobile, setPreviewMobile] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewCampaign: PopupEligiblePayload | null = useMemo(() => {
    const copy =
      previewLocale === "ar"
        ? { title: form.arTitle, body: form.arBody, cta: form.arCta }
        : previewLocale === "en"
          ? { title: form.enTitle, body: form.enBody, cta: form.enCta }
          : { title: form.frTitle, body: form.frBody, cta: form.frCta };
    if (!copy.title.trim() || !copy.body.trim()) return null;
    return {
      id: "preview",
      trigger: form.trigger,
      delaySeconds: Number(form.delaySeconds) || 8,
      scrollPercent: Number(form.scrollPercent) || 50,
      frequency: form.frequency,
      priority: Number(form.priority) || 50,
      imageUrl: form.imageUrl || null,
      ctaUrl: form.ctaUrl || null,
      title: copy.title,
      body: copy.body,
      ctaLabel: copy.cta || null,
      locale: previewLocale,
    };
  }, [form, previewLocale]);

  const columns = useMemo<ColumnDef<AdminPopupRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "trigger", header: "Trigger" },
      {
        accessorKey: "priority",
        header: "Priority",
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
        id: "stats",
        header: "Impr / CTR",
        cell: ({ row }) => {
          const { impressions, clicks } = row.original;
          const ctr =
            impressions > 0 ? `${Math.round((clicks / impressions) * 1000) / 10}%` : "—";
          return `${impressions} / ${ctr}`;
        },
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
            <Button variant="ghost" size="sm" onClick={() => setForm(rowToForm(row.original))}>
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
    <div className="grid gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form
        className="space-y-4 border border-border p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const payload = formPayload(form);
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
          <Label htmlFor="popup-name">Internal name</Label>
          <Input
            id="popup-name"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="popup-priority">Priority (1 = first)</Label>
            <Input
              id="popup-priority"
              type="number"
              min={1}
              max={100}
              value={form.priority}
              onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value }))}
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((c) => ({ ...c, isActive: Boolean(checked) }))}
            />
            Active
          </label>
        </div>

        {(["fr", "en", "ar"] as const).map((locale) => {
          const titleKey = `${locale}Title` as const;
          const bodyKey = `${locale}Body` as const;
          const ctaKey = `${locale}Cta` as const;
          return (
          <fieldset key={locale} className="space-y-2 border border-border/60 p-3">
            <legend className="px-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {locale.toUpperCase()}
            </legend>
            <Input
              placeholder="Title"
              value={form[titleKey]}
              onChange={(e) => setForm((c) => ({ ...c, [titleKey]: e.target.value }))}
            />
            <Textarea
              rows={3}
              placeholder="Body"
              value={form[bodyKey]}
              onChange={(e) => setForm((c) => ({ ...c, [bodyKey]: e.target.value }))}
            />
            <Input
              placeholder="CTA label"
              value={form[ctaKey]}
              onChange={(e) => setForm((c) => ({ ...c, [ctaKey]: e.target.value }))}
            />
          </fieldset>
          );
        })}

        <div className="space-y-2">
          <Label htmlFor="popup-cta-url">CTA URL (path or https)</Label>
          <Input
            id="popup-cta-url"
            value={form.ctaUrl}
            placeholder="/fr/shop or https://www.lorvex.ma/fr/shop"
            onChange={(e) => setForm((c) => ({ ...c, ctaUrl: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="popup-image">Image URL (optional)</Label>
          <Input
            id="popup-image"
            value={form.imageUrl}
            onChange={(e) => setForm((c) => ({ ...c, imageUrl: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Trigger</Label>
          <Select
            value={form.trigger}
            onValueChange={(value) =>
              setForm((c) => ({ ...c, trigger: value as PopupTrigger }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IMMEDIATE">Immediate</SelectItem>
              <SelectItem value="DELAY">Delay</SelectItem>
              <SelectItem value="SCROLL">Scroll</SelectItem>
              <SelectItem value="EXIT_INTENT">Exit intent (desktop; delay on mobile)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(form.trigger === "DELAY" || form.trigger === "EXIT_INTENT") && (
          <div className="space-y-2">
            <Label htmlFor="popup-delay">Delay seconds</Label>
            <Input
              id="popup-delay"
              type="number"
              min={1}
              max={120}
              value={form.delaySeconds}
              onChange={(e) => setForm((c) => ({ ...c, delaySeconds: e.target.value }))}
            />
          </div>
        )}
        {form.trigger === "SCROLL" && (
          <div className="space-y-2">
            <Label htmlFor="popup-scroll">Scroll percent</Label>
            <Input
              id="popup-scroll"
              type="number"
              min={10}
              max={95}
              value={form.scrollPercent}
              onChange={(e) => setForm((c) => ({ ...c, scrollPercent: e.target.value }))}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Pages (never admin, auth, account, cart, checkout, order)</Label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {PAGE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <Checkbox
                  checked={form.pageTargets.includes(option.value)}
                  onCheckedChange={(checked) =>
                    setForm((c) => {
                      const next = checked
                        ? [...new Set([...c.pageTargets, option.value])]
                        : c.pageTargets.filter((item) => item !== option.value);
                      return { ...c, pageTargets: next.length ? next : ["ALL"] };
                    })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Locale</Label>
            <Select
              value={form.localeTarget}
              onValueChange={(value) =>
                setForm((c) => ({ ...c, localeTarget: value as PopupLocaleTarget }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locales</SelectItem>
                <SelectItem value="fr">FR</SelectItem>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="ar">AR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Device</Label>
            <Select
              value={form.deviceTarget}
              onValueChange={(value) =>
                setForm((c) => ({ ...c, deviceTarget: value as PopupDevice }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="DESKTOP">Desktop</SelectItem>
                <SelectItem value="MOBILE">Mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select
              value={form.audience}
              onValueChange={(value) =>
                setForm((c) => ({ ...c, audience: value as PopupAudience }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone</SelectItem>
                <SelectItem value="GUESTS">Guests</SelectItem>
                <SelectItem value="AUTHENTICATED">Signed in</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(value) =>
                setForm((c) => ({ ...c, frequency: value as PopupFrequency }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVERY_VISIT">Every visit</SelectItem>
                <SelectItem value="ONCE_PER_SESSION">Once per session</SelectItem>
                <SelectItem value="ONCE_PER_DAY">Once per day</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!previewCampaign) {
                toast.error("Add title and body for the preview locale.");
                return;
              }
              setPreviewOpen(true);
            }}
          >
            Preview
          </Button>
          <Select value={previewLocale} onValueChange={(v) => setPreviewLocale(v as Locale)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">FR</SelectItem>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="ar">AR</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPreviewMobile((v) => !v)}
          >
            {previewMobile ? "Desktop frame" : "Mobile frame"}
          </Button>
        </div>

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

      <DataTable columns={columns} searchKey="name" searchPlaceholder="Search popups…" data={popups} />

      {previewCampaign ? (
        <div className={previewMobile ? "mx-auto w-[360px]" : undefined}>
          <MarketingPopupDialog
            campaign={previewCampaign}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            preview
          />
        </div>
      ) : null}
    </div>
  );
}
