import { NextResponse } from "next/server";
import {
  createSignedUploadParams,
  getCloudinaryConfigStatus,
  isCloudinaryConfigured,
  verifyCloudinaryConnection,
  type CloudinaryResourceType,
} from "@/lib/cloudinary";
import { assertPermission } from "@/server/auth/require-admin";

const ALLOWED_FOLDERS = new Set(["lorvex", "lorvex/hero", "lorvex/media"]);
const ALLOWED_RESOURCE_TYPES = new Set<CloudinaryResourceType>([
  "image",
  "video",
  "auto",
]);

export async function POST(request: Request) {
  try {
    await assertPermission("media.manage");
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    return NextResponse.json(
      { error: message === "FORBIDDEN" ? "Forbidden." : "Unauthorized." },
      { status: message === "FORBIDDEN" ? 403 : 401 },
    );
  }

  if (!isCloudinaryConfigured()) {
    const status = getCloudinaryConfigStatus();
    return NextResponse.json(
      {
        error: "Cloudinary is not configured.",
        missing: status.missing,
      },
      { status: 503 },
    );
  }

  const live = await verifyCloudinaryConnection();
  if (!live.ok) {
    return NextResponse.json(
      {
        error:
          live.error === "cloud_name mismatch"
            ? "Cloudinary cloud_name mismatch: CLOUDINARY_CLOUD_NAME does not match your API key. Copy the exact Cloud name from the Cloudinary console."
            : `Cloudinary credentials invalid: ${live.error ?? "connection failed"}`,
      },
      { status: 503 },
    );
  }

  let body: {
    folder?: string;
    resourceType?: CloudinaryResourceType;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const folder =
    typeof body.folder === "string" && ALLOWED_FOLDERS.has(body.folder)
      ? body.folder
      : "lorvex/hero";
  const resourceType =
    body.resourceType && ALLOWED_RESOURCE_TYPES.has(body.resourceType)
      ? body.resourceType
      : "auto";

  const params = createSignedUploadParams(folder, { resourceType });
  return NextResponse.json(params);
}
