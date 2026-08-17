"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteMediaAsset,
  registerMediaAsset,
} from "@/server/actions/admin/media";

export type MediaAssetRow = {
  id: string;
  publicId: string;
  url: string;
  type: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  alt: string | null;
  folder: string | null;
  createdAt: string;
};

type CloudinarySign = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  resourceType?: string;
  uploadUrl?: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({
  assets,
  cloudinaryConfigured,
  missingConfig,
}: {
  assets: MediaAssetRow[];
  cloudinaryConfigured: boolean;
  missingConfig: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualPublicId, setManualPublicId] = useState("");
  const [manualAlt, setManualAlt] = useState("");

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const signRes = await fetch("/api/admin/cloudinary/sign", { method: "POST" });
      if (!signRes.ok) {
        const body = (await signRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Unable to sign upload.");
      }
      const sign = (await signRes.json()) as CloudinarySign;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", String(sign.timestamp));
      formData.append("folder", sign.folder);
      formData.append("signature", sign.signature);

      const uploadRes = await fetch(
        sign.uploadUrl ??
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`,
        { method: "POST", body: formData },
      );
      if (!uploadRes.ok) throw new Error("Cloudinary upload failed.");
      const payload = (await uploadRes.json()) as {
        public_id: string;
        secure_url: string;
        resource_type: string;
        format?: string;
        width?: number;
        height?: number;
        bytes?: number;
      };

      startTransition(async () => {
        const result = await registerMediaAsset({
          publicId: payload.public_id,
          url: payload.secure_url,
          type: payload.resource_type,
          format: payload.format ?? null,
          width: payload.width ?? null,
          height: payload.height ?? null,
          bytes: payload.bytes ?? null,
          alt: file.name,
          folder: sign.folder,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Asset uploaded.");
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleManualRegister() {
    if (!manualUrl.trim() || !manualPublicId.trim()) {
      toast.error("URL and public ID are required.");
      return;
    }
    startTransition(async () => {
      const result = await registerMediaAsset({
        publicId: manualPublicId.trim(),
        url: manualUrl.trim(),
        type: "image",
        alt: manualAlt.trim() || null,
        folder: "external",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Asset registered.");
      setManualUrl("");
      setManualPublicId("");
      setManualAlt("");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this asset from the library?")) return;
    startTransition(async () => {
      const result = await deleteMediaAsset(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Asset deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Media library"
        description="Upload and manage assets for products, CMS blocks and marketing."
        actions={
          cloudinaryConfigured ? (
            <Label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                disabled={uploading || pending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                  event.target.value = "";
                }}
              />
              <Button asChild variant="outline" size="sm" disabled={uploading || pending}>
                <span>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload file
                </span>
              </Button>
            </Label>
          ) : null
        }
      />

      {!cloudinaryConfigured && (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-none">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">Cloudinary is not configured</p>
            <p className="text-sm text-muted-foreground">
              Set environment variables to enable direct uploads, or register assets by URL below.
            </p>
            {missingConfig.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {missingConfig.map((key) => (
                  <Badge key={key} variant="outline">
                    {key}
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="manual-url">Asset URL</Label>
                <Input
                  id="manual-url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-public-id">Public ID</Label>
                <Input
                  id="manual-public-id"
                  value={manualPublicId}
                  onChange={(e) => setManualPublicId(e.target.value)}
                  placeholder="folder/asset-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-alt">Alt text</Label>
                <Input
                  id="manual-alt"
                  value={manualAlt}
                  onChange={(e) => setManualAlt(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <Button onClick={handleManualRegister} disabled={pending}>
              Register URL
            </Button>
          </CardContent>
        </Card>
      )}

      {assets.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No media assets yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden border-border/80 shadow-none">
              <div className="relative aspect-square bg-muted/30">
                {asset.type === "video" ? (
                  <video
                    src={asset.url}
                    className="h-full w-full object-cover"
                    controls
                    preload="metadata"
                  />
                ) : (
                  <Image
                    src={asset.url}
                    alt={asset.alt ?? asset.publicId}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                  />
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <p className="truncate text-sm font-medium" title={asset.publicId}>
                  {asset.publicId}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{asset.type}</Badge>
                  {asset.format && <Badge variant="muted">{asset.format}</Badge>}
                  <span>{formatBytes(asset.bytes)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => handleDelete(asset.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
