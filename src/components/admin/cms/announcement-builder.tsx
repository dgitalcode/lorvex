"use client";

import { useState, useTransition } from "react";
import { Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import {
  publishCmsDocument,
  restoreCmsVersion,
  saveCmsDraft,
  scheduleCmsPublish,
} from "@/server/actions/admin/cms";
import type { AnnouncementDocumentContent } from "@/server/validations/admin/cms";

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function AnnouncementBuilder({
  documentId,
  documentStatus,
  scheduledAt,
  publishedAt,
  initialContent,
  liveMessage,
  liveActive,
  versions,
}: {
  documentId: string;
  documentStatus: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  initialContent: AnnouncementDocumentContent;
  liveMessage: string | null;
  liveActive: boolean;
  versions: {
    version: number;
    note: string | null;
    createdAt: string;
    author: string;
  }[];
}) {
  const [content, setContent] = useState(initialContent);
  const [scheduleInput, setScheduleInput] = useState(toLocalInput(scheduledAt));
  const [isPending, startTransition] = useTransition();

  const persist = async () =>
    saveCmsDraft({
      key: "announcement",
      type: "announcement",
      title: "Announcement bar",
      content: {
        ...content,
        startsAt: content.startsAt || null,
        endsAt: content.endsAt || null,
      },
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 border border-border p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{documentStatus}</Badge>
          {publishedAt && (
            <span className="text-xs text-muted-foreground">
              Last published {formatDateTime(publishedAt)}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-message">Message</Label>
          <Textarea
            id="announcement-message"
            rows={3}
            value={content.message}
            onChange={(e) =>
              setContent((prev) => ({ ...prev, message: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-href">Optional link (href)</Label>
          <Input
            id="announcement-href"
            value={content.href ?? ""}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                href: e.target.value || null,
              }))
            }
            placeholder="/fr/shop"
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">
              When inactive, the bar is hidden on the storefront.
            </p>
          </div>
          <Switch
            checked={content.isActive}
            onCheckedChange={(checked) =>
              setContent((prev) => ({ ...prev, isActive: checked }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="announcement-starts">Starts at</Label>
            <Input
              id="announcement-starts"
              type="datetime-local"
              value={toLocalInput(content.startsAt ?? undefined)}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  startsAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-ends">Ends at</Label>
            <Input
              id="announcement-ends"
              type="datetime-local"
              value={toLocalInput(content.endsAt ?? undefined)}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  endsAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                }))
              }
            />
          </div>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Preview
          </p>
          <div className="mt-3 bg-primary px-4 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-primary-foreground">
            {content.message || "Announcement message"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await persist();
                toast[result.ok ? "success" : "error"](
                  result.ok ? "Draft saved" : result.error,
                );
              })
            }
          >
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const saveResult = await persist();
                if (!saveResult.ok) {
                  toast.error(saveResult.error);
                  return;
                }
                const result = await publishCmsDocument("announcement");
                toast[result.ok ? "success" : "error"](
                  result.ok ? "Announcement published" : result.error,
                );
              })
            }
          >
            <Upload className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="border border-border p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Live production
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Status:{" "}
              <span className="font-medium">
                {liveActive ? "Active" : "Inactive"}
              </span>
            </p>
            <p className="text-muted-foreground">{liveMessage || "No message"}</p>
          </div>
        </div>

        <div className="border border-border p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Schedule publish
          </p>
          <div className="mt-3 space-y-3">
            <Input
              type="datetime-local"
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isPending || !scheduleInput}
              onClick={() =>
                startTransition(async () => {
                  const saveResult = await persist();
                  if (!saveResult.ok) {
                    toast.error(saveResult.error);
                    return;
                  }
                  const result = await scheduleCmsPublish(
                    "announcement",
                    new Date(scheduleInput).toISOString(),
                  );
                  toast[result.ok ? "success" : "error"](
                    result.ok ? "Publish scheduled" : result.error,
                  );
                })
              }
            >
              Schedule
            </Button>
          </div>
        </div>

        <div className="border border-border p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Version history
          </p>
          <div className="mt-3 space-y-2">
            {versions.map((version) => (
              <div
                key={version.version}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm">v{version.version}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(version.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await restoreCmsVersion(
                        documentId,
                        version.version,
                      );
                      if (result.ok) window.location.reload();
                      else toast.error(result.error);
                    })
                  }
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
