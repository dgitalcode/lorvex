"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { EmailConfigBanner } from "@/components/admin/marketing/email-config-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  createCampaign,
  createFlashSale,
  sendCampaign,
  updateCampaign,
  updateFlashSale,
} from "@/server/actions/admin/marketing";

export type AdminCampaignRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  body: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  stats: { sent?: number; failed?: number; total?: number } | null;
};

export type AdminFlashSaleRow = {
  id: string;
  name: string;
  productName: string | null;
  collectionName: string | null;
  salePrice: number | null;
  percentOff: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

type CampaignForm = {
  id?: string;
  name: string;
  type: "EMAIL" | "NEWSLETTER" | "PROMOTION";
  subject: string;
  body: string;
  scheduledAt: string;
};

type FlashForm = {
  id?: string;
  name: string;
  productId: string;
  collectionId: string;
  salePrice: string;
  percentOff: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyCampaign: CampaignForm = {
  name: "",
  type: "NEWSLETTER",
  subject: "",
  body: "",
  scheduledAt: "",
};

const emptyFlash: FlashForm = {
  name: "",
  productId: "",
  collectionId: "",
  salePrice: "",
  percentOff: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

type Props = {
  campaigns: AdminCampaignRow[];
  flashSales: AdminFlashSaleRow[];
  products: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  emailStatus: { configured: boolean; from: string; missing: string[] };
  subscriberCount: number;
};

function statusBadge(status: string) {
  if (status === "SENT") return <Badge variant="accent">Sent</Badge>;
  if (status === "FAILED") return <Badge variant="outline">Failed</Badge>;
  if (status === "SCHEDULED") return <Badge variant="outline">Scheduled</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export function CampaignsManager({
  campaigns,
  flashSales,
  products,
  collections,
  emailStatus,
  subscriberCount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(emptyCampaign);
  const [flashForm, setFlashForm] = useState<FlashForm>(emptyFlash);

  const campaignColumns = useMemo<ColumnDef<AdminCampaignRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "stats",
        header: "Sent",
        cell: ({ row }) => {
          const stats = row.original.stats;
          if (!stats?.sent) return "—";
          return `${stats.sent}${stats.total ? ` / ${stats.total}` : ""}`;
        },
      },
      {
        accessorKey: "sentAt",
        header: "Sent at",
        cell: ({ row }) =>
          row.original.sentAt ? formatDate(row.original.sentAt) : "—",
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
                setCampaignForm({
                  id: row.original.id,
                  name: row.original.name,
                  type: row.original.type as CampaignForm["type"],
                  subject: row.original.subject ?? "",
                  body: row.original.body ?? "",
                  scheduledAt: row.original.scheduledAt?.slice(0, 16) ?? "",
                })
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.status !== "SENT" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!emailStatus.configured}
                title={
                  emailStatus.configured
                    ? "Send to newsletter subscribers"
                    : "Configure RESEND_API_KEY first"
                }
                onClick={() =>
                  startTransition(async () => {
                    const result = await sendCampaign({ id: row.original.id });
                    if (!result.ok) {
                      if (result.reason === "NOT_CONFIGURED") {
                        toast.error("Email is not configured (RESEND_API_KEY missing).");
                      } else {
                        toast.error(result.error);
                      }
                      return;
                    }
                    toast.success(`Campaign sent to ${result.count ?? 0} subscribers`);
                    router.refresh();
                  })
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [emailStatus.configured, router],
  );

  const flashColumns = useMemo<ColumnDef<AdminFlashSaleRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        id: "target",
        header: "Target",
        cell: ({ row }) =>
          row.original.productName ?? row.original.collectionName ?? "—",
      },
      {
        id: "discount",
        header: "Discount",
        cell: ({ row }) => {
          if (row.original.percentOff) return `${row.original.percentOff}% off`;
          if (row.original.salePrice) return formatPrice(row.original.salePrice);
          return "—";
        },
      },
      {
        id: "window",
        header: "Window",
        cell: ({ row }) =>
          `${formatDate(row.original.startsAt)} → ${formatDate(row.original.endsAt)}`,
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
              setFlashForm({
                id: row.original.id,
                name: row.original.name,
                productId: "",
                collectionId: "",
                salePrice: row.original.salePrice?.toString() ?? "",
                percentOff: row.original.percentOff?.toString() ?? "",
                startsAt: row.original.startsAt.slice(0, 16),
                endsAt: row.original.endsAt.slice(0, 16),
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
    <div className="space-y-10">
      <EmailConfigBanner status={emailStatus} />

      <p className="text-sm text-muted-foreground">
        {subscriberCount.toLocaleString("fr-MA")} active newsletter subscribers
      </p>

      <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="space-y-4 border border-border p-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const payload = {
                name: campaignForm.name,
                type: campaignForm.type,
                subject: campaignForm.subject,
                body: campaignForm.body,
                scheduledAt: campaignForm.scheduledAt
                  ? new Date(campaignForm.scheduledAt)
                  : null,
              };
              const result = campaignForm.id
                ? await updateCampaign({ ...payload, id: campaignForm.id })
                : await createCampaign(payload);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(campaignForm.id ? "Campaign updated" : "Campaign created");
              setCampaignForm(emptyCampaign);
              router.refresh();
            });
          }}
        >
          <h2 className="font-display text-xl">
            {campaignForm.id ? "Edit campaign" : "New campaign"}
          </h2>
          <div className="space-y-2">
            <Label htmlFor="camp-name">Name</Label>
            <Input
              id="camp-name"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={campaignForm.type}
              onValueChange={(value) =>
                setCampaignForm((c) => ({
                  ...c,
                  type: value as CampaignForm["type"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWSLETTER">Newsletter</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PROMOTION">Promotion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="camp-subject">Subject</Label>
            <Input
              id="camp-subject"
              value={campaignForm.subject}
              onChange={(e) => setCampaignForm((c) => ({ ...c, subject: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camp-body">HTML body</Label>
            <Textarea
              id="camp-body"
              rows={8}
              value={campaignForm.body}
              onChange={(e) => setCampaignForm((c) => ({ ...c, body: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camp-scheduled">Schedule (optional)</Label>
            <Input
              id="camp-scheduled"
              type="datetime-local"
              value={campaignForm.scheduledAt}
              onChange={(e) =>
                setCampaignForm((c) => ({ ...c, scheduledAt: e.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : campaignForm.id ? "Update campaign" : "Create campaign"}
            </Button>
            {campaignForm.id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCampaignForm(emptyCampaign)}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <DataTable
          columns={campaignColumns}
          data={campaigns}
          searchKey="name"
          searchPlaceholder="Search campaigns…"
        />
      </div>

      <div>
        <h2 className="mb-6 font-display text-2xl">Flash sales</h2>
        <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <form
            className="space-y-4 border border-border p-5"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const payload = {
                  name: flashForm.name,
                  productId: flashForm.productId || null,
                  collectionId: flashForm.collectionId || null,
                  salePrice: flashForm.salePrice ? Number(flashForm.salePrice) : null,
                  percentOff: flashForm.percentOff ? Number(flashForm.percentOff) : null,
                  startsAt: new Date(flashForm.startsAt),
                  endsAt: new Date(flashForm.endsAt),
                  isActive: flashForm.isActive,
                };
                const result = flashForm.id
                  ? await updateFlashSale({ ...payload, id: flashForm.id })
                  : await createFlashSale(payload);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(flashForm.id ? "Flash sale updated" : "Flash sale created");
                setFlashForm(emptyFlash);
                router.refresh();
              });
            }}
          >
            <h3 className="font-display text-lg">
              {flashForm.id ? "Edit flash sale" : "New flash sale"}
            </h3>
            <div className="space-y-2">
              <Label htmlFor="flash-name">Name</Label>
              <Input
                id="flash-name"
                value={flashForm.name}
                onChange={(e) => setFlashForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={flashForm.productId || "none"}
                onValueChange={(value) =>
                  setFlashForm((c) => ({
                    ...c,
                    productId: value === "none" ? "" : value,
                    collectionId: value === "none" ? c.collectionId : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Collection</Label>
              <Select
                value={flashForm.collectionId || "none"}
                onValueChange={(value) =>
                  setFlashForm((c) => ({
                    ...c,
                    collectionId: value === "none" ? "" : value,
                    productId: value === "none" ? c.productId : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="flash-price">Sale price</Label>
                <Input
                  id="flash-price"
                  type="number"
                  min={0}
                  value={flashForm.salePrice}
                  onChange={(e) =>
                    setFlashForm((c) => ({ ...c, salePrice: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flash-percent">Percent off</Label>
                <Input
                  id="flash-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={flashForm.percentOff}
                  onChange={(e) =>
                    setFlashForm((c) => ({ ...c, percentOff: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="flash-starts">Starts</Label>
                <Input
                  id="flash-starts"
                  type="datetime-local"
                  value={flashForm.startsAt}
                  onChange={(e) =>
                    setFlashForm((c) => ({ ...c, startsAt: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flash-ends">Ends</Label>
                <Input
                  id="flash-ends"
                  type="datetime-local"
                  value={flashForm.endsAt}
                  onChange={(e) =>
                    setFlashForm((c) => ({ ...c, endsAt: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : flashForm.id ? "Update flash sale" : "Create flash sale"}
              </Button>
              {flashForm.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFlashForm(emptyFlash)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <DataTable
            columns={flashColumns}
            data={flashSales}
            searchKey="name"
            searchPlaceholder="Search flash sales…"
          />
        </div>
      </div>
    </div>
  );
}
