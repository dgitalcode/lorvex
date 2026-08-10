import { NextResponse } from "next/server";
import {
  createSignedUploadParams,
  getCloudinaryConfigStatus,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { assertPermission } from "@/server/auth/require-admin";

export async function POST() {
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

  const params = createSignedUploadParams("lorvex");
  return NextResponse.json(params);
}
