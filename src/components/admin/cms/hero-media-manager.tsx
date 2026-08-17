"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Film, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { registerMediaAsset } from "@/server/actions/admin/media";

export type HeroMediaType = "image" | "video" | "none";

export type HeroMediaContent = {
  mediaType?: HeroMediaType;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  imagePublicId?: string;
  videoPublicId?: string;
  posterPublicId?: string;
};

type CloudinarySign = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  resourceType: "image" | "video" | "auto";
  uploadUrl: string;
};

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const VIDEO_EXT = /\.(mp4|webm)$/i;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateImage(file: File) {
  const okType = IMAGE_TYPES.has(file.type) || IMAGE_EXT.test(file.name);
  if (!okType) return "Use JPG, PNG, WEBP or AVIF.";
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image must be under ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}

function validateVideo(file: File) {
  const okType = VIDEO_TYPES.has(file.type) || VIDEO_EXT.test(file.name);
  if (!okType) return "Use MP4 or WEBM.";
  if (file.size > MAX_VIDEO_BYTES) {
    return `Video must be under ${formatBytes(MAX_VIDEO_BYTES)}.`;
  }
  return null;
}

async function signUpload(resourceType: "image" | "video") {
  const signRes = await fetch("/api/admin/cloudinary/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      folder: "lorvex/hero",
      resourceType,
    }),
  });
  if (!signRes.ok) {
    const body = (await signRes.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Unable to sign upload.");
  }
  return (await signRes.json()) as CloudinarySign;
}

function uploadWithProgress(
  file: File,
  sign: CloudinarySign,
  onProgress: (pct: number) => void,
) {
  return new Promise<{
    public_id: string;
    secure_url: string;
    resource_type: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sign.uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Cloudinary upload failed."));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as {
          public_id: string;
          secure_url: string;
          resource_type: string;
          format?: string;
          width?: number;
          height?: number;
          bytes?: number;
        });
      } catch {
        reject(new Error("Invalid Cloudinary response."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sign.apiKey);
    formData.append("timestamp", String(sign.timestamp));
    formData.append("folder", sign.folder);
    formData.append("signature", sign.signature);
    xhr.send(formData);
  });
}

export function HeroMediaManager({
  content,
  onChange,
  cloudinaryConfigured = true,
}: {
  content: HeroMediaContent & Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  cloudinaryConfigured?: boolean;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"image" | "video" | "poster" | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoMeta, setVideoMeta] = useState<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);

  const mediaType: HeroMediaType =
    content.mediaType ??
    (content.videoUrl ? "video" : content.imageUrl ? "image" : "none");

  const patch = (next: Partial<HeroMediaContent>) => {
    onChange({ ...content, ...next });
  };

  async function runUpload(
    kind: "image" | "video" | "poster",
    file: File,
  ) {
    const error =
      kind === "video" ? validateVideo(file) : validateImage(file);
    if (error) {
      toast.error(error);
      return;
    }
    if (!cloudinaryConfigured) {
      toast.error("Cloudinary is not configured.");
      return;
    }

    setBusy(kind);
    setProgress(0);
    try {
      const resourceType = kind === "video" ? "video" : "image";
      const sign = await signUpload(resourceType);
      const payload = await uploadWithProgress(file, sign, setProgress);

      if (kind === "video" && payload.resource_type !== "video") {
        throw new Error("Upload did not return a video asset.");
      }
      if (kind !== "video" && payload.resource_type === "video") {
        throw new Error("Upload did not return an image asset.");
      }

      const register = await registerMediaAsset({
        publicId: payload.public_id,
        url: payload.secure_url,
        type: payload.resource_type,
        format: payload.format ?? null,
        width: payload.width ?? null,
        height: payload.height ?? null,
        bytes: payload.bytes ?? null,
        alt: `Hero ${kind}`,
        folder: sign.folder,
      });
      if (!register.ok) {
        toast.error(register.error);
        return;
      }

      if (kind === "image") {
        patch({
          mediaType: mediaType === "none" ? "image" : mediaType,
          imageUrl: payload.secure_url,
          imagePublicId: payload.public_id,
          posterUrl: content.posterUrl || payload.secure_url,
        });
      } else if (kind === "poster") {
        patch({
          posterUrl: payload.secure_url,
          posterPublicId: payload.public_id,
          imageUrl: content.imageUrl || payload.secure_url,
        });
      } else {
        patch({
          mediaType: "video",
          videoUrl: payload.secure_url,
          videoPublicId: payload.public_id,
        });
      }

      toast.success(
        kind === "video"
          ? "Hero video uploaded."
          : kind === "poster"
            ? "Poster uploaded."
            : "Hero image uploaded.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-5 rounded-none border border-border/80 bg-card/40 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Hero Media
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload image or video to Cloudinary. Publish the homepage to push
          media to the storefront.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["image", "video", "none"] as const).map((type) => (
          <Button
            key={type}
            type="button"
            size="sm"
            variant={mediaType === type ? "default" : "outline"}
            onClick={() => patch({ mediaType: type })}
          >
            {type === "image" ? (
              <ImageIcon className="mr-2 h-3.5 w-3.5" />
            ) : type === "video" ? (
              <Film className="mr-2 h-3.5 w-3.5" />
            ) : null}
            {type === "none" ? "None / fallback" : type.toUpperCase()}
          </Button>
        ))}
      </div>

      {busy && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading {busy}… {progress}%
          </div>
          <div className="h-1.5 overflow-hidden bg-muted">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {(mediaType === "image" || mediaType === "video") && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runUpload("image", file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => imageInputRef.current?.click()}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {content.imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {content.imageUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={Boolean(busy)}
                onClick={() =>
                  patch({
                    imageUrl: "",
                    imagePublicId: "",
                    mediaType:
                      mediaType === "image" && !content.videoUrl
                        ? "none"
                        : mediaType,
                  })
                }
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove image
              </Button>
            ) : null}
          </div>

          {content.imageUrl ? (
            <div className="relative aspect-[16/9] max-w-xl overflow-hidden border border-border bg-muted">
              <Image
                src={content.imageUrl}
                alt="Hero image preview"
                fill
                className="object-cover"
                sizes="640px"
                unoptimized
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hero image yet.</p>
          )}
        </div>
      )}

      {mediaType === "video" && (
        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap gap-2">
            <input
              ref={videoInputRef}
              type="file"
              accept=".mp4,.webm,video/mp4,video/webm"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runUpload("video", file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => videoInputRef.current?.click()}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {content.videoUrl ? "Replace video" : "Upload MP4 / WEBM"}
            </Button>
            {content.videoUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={Boolean(busy)}
                onClick={() =>
                  patch({
                    videoUrl: "",
                    videoPublicId: "",
                    mediaType: content.imageUrl ? "image" : "none",
                  })
                }
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove video
              </Button>
            ) : null}
          </div>

          {content.videoUrl ? (
            <div className="space-y-2">
              <video
                key={content.videoUrl}
                src={content.videoUrl}
                poster={content.posterUrl || content.imageUrl || undefined}
                controls
                muted
                playsInline
                className="aspect-video max-w-xl border border-border bg-black object-cover"
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  setVideoMeta({
                    width: el.videoWidth,
                    height: el.videoHeight,
                    duration: el.duration,
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Preview is muted. Storefront autoplay uses muted + playsInline.
                {videoMeta ? (
                  <>
                    {" "}
                    · {videoMeta.width}×{videoMeta.height} ·{" "}
                    {Math.round(videoMeta.duration)}s
                  </>
                ) : null}
                {content.videoPublicId ? (
                  <>
                    {" "}
                    · <span className="font-mono">{content.videoPublicId}</span>
                  </>
                ) : null}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hero video yet.</p>
          )}

          <div className="space-y-2">
            <Label>Poster / fallback image</Label>
            <div className="flex flex-wrap gap-2">
              <input
                ref={posterInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void runUpload("poster", file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={Boolean(busy)}
                onClick={() => posterInputRef.current?.click()}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {content.posterUrl || content.imageUrl
                  ? "Replace poster"
                  : "Upload poster"}
              </Button>
            </div>
            {(content.posterUrl || content.imageUrl) && (
              <p className={cn("truncate text-xs text-muted-foreground")}>
                {content.posterUrl || content.imageUrl}
              </p>
            )}
          </div>
        </div>
      )}

      {mediaType === "none" && (
        <p className="text-sm text-muted-foreground">
          Storefront will use the built-in LORVEX hero image fallback.
        </p>
      )}

      {!cloudinaryConfigured && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Cloudinary is not configured. Set CLOUDINARY_* env vars to enable
          uploads.
        </p>
      )}
    </div>
  );
}
