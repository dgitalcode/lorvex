"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { assertPermission } from "@/server/auth/require-admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  deleteMediaAssetSchema,
  registerMediaAssetSchema,
  type RegisterMediaAssetInput,
} from "@/server/validations/admin/media";

export type MediaActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function actionError(error: unknown): MediaActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { ok: false, error: "This asset is already registered." };
    }
    if (error.code === "P2025") {
      return { ok: false, error: "Asset not found." };
    }
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return { ok: false, error: "Unauthorized." };
    if (error.message === "FORBIDDEN") return { ok: false, error: "Forbidden." };
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong." };
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

export async function registerMediaAsset(
  input: RegisterMediaAssetInput,
): Promise<MediaActionResult> {
  try {
    const user = await assertPermission("media.manage");
    const data = registerMediaAssetSchema.parse(input);

    const format = data.format?.toLowerCase() ?? null;
    if (data.type === "video") {
      if (format && !["mp4", "webm"].includes(format)) {
        return { ok: false, error: "Unsupported video format. Use MP4 or WEBM." };
      }
      if (data.bytes != null && data.bytes > 80 * 1024 * 1024) {
        return { ok: false, error: "Video must be under 80 MB." };
      }
    } else if (data.type === "image") {
      if (format && !["jpg", "jpeg", "png", "webp", "avif"].includes(format)) {
        return {
          ok: false,
          error: "Unsupported image format. Use JPG, PNG, WEBP or AVIF.",
        };
      }
      if (data.bytes != null && data.bytes > 8 * 1024 * 1024) {
        return { ok: false, error: "Image must be under 8 MB." };
      }
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        publicId: data.publicId,
        url: data.url,
        type: data.type,
        format: emptyToNull(data.format),
        width: data.width ?? null,
        height: data.height ?? null,
        bytes: data.bytes ?? null,
        alt: emptyToNull(data.alt),
        folder: emptyToNull(data.folder),
        createdBy: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "media.register",
      entity: "MediaAsset",
      entityId: asset.id,
      metadata: { publicId: asset.publicId, url: asset.url },
    });

    revalidatePath("/admin/media");
    return { ok: true, id: asset.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteMediaAsset(id: string): Promise<MediaActionResult> {
  try {
    const user = await assertPermission("media.manage");
    const { id: assetId } = deleteMediaAssetSchema.parse({ id });

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return { ok: false, error: "Asset not found." };
    }

    if (isCloudinaryConfigured() && asset.publicId) {
      try {
        const resourceType =
          asset.type === "video" || asset.type === "raw" ? asset.type : "image";
        await destroyCloudinaryAsset(
          asset.publicId,
          resourceType as "image" | "video" | "raw",
        );
      } catch {
        // Keep DB cleanup even if remote delete fails.
      }
    }

    await prisma.mediaAsset.delete({ where: { id: assetId } });

    await writeAuditLog({
      userId: user.id,
      action: "media.delete",
      entity: "MediaAsset",
      entityId: assetId,
      metadata: { publicId: asset.publicId },
    });

    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
