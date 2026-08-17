import { v2 as cloudinary } from "cloudinary";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

const cloudName =
  env("CLOUDINARY_CLOUD_NAME") || env("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
const apiKey = env("CLOUDINARY_API_KEY");
const apiSecret = env("CLOUDINARY_API_SECRET");

export type CloudinaryResourceType = "image" | "video" | "auto" | "raw";

export function isCloudinaryConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

export function getCloudinaryConfigStatus() {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: cloudName || null,
    missing: [
      !cloudName ? "CLOUDINARY_CLOUD_NAME" : null,
      !apiKey ? "CLOUDINARY_API_KEY" : null,
      !apiSecret ? "CLOUDINARY_API_SECRET" : null,
    ].filter(Boolean) as string[],
  };
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/** Live credential check — catches cloud_name / key mismatches that env presence alone misses. */
export async function verifyCloudinaryConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isCloudinaryConfigured()) {
    return { ok: false, error: "Cloudinary env vars are missing." };
  }
  try {
    await cloudinary.api.ping();
    return { ok: true };
  } catch (error) {
    const message =
      error &&
      typeof error === "object" &&
      "error" in error &&
      error.error &&
      typeof error.error === "object" &&
      "message" in error.error
        ? String((error.error as { message?: string }).message)
        : error instanceof Error
          ? error.message
          : "Cloudinary connection failed.";
    return { ok: false, error: message };
  }
}

export function createSignedUploadParams(
  folder = "lorvex",
  options?: { resourceType?: CloudinaryResourceType },
) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret!);
  const resourceType = options?.resourceType ?? "auto";
  return {
    cloudName: cloudName!,
    apiKey: apiKey!,
    timestamp,
    folder,
    signature,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
  };
}

export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: CloudinaryResourceType = "image",
) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === "auto" ? "image" : resourceType,
  });
}

export async function getCloudinaryUsage() {
  if (!isCloudinaryConfigured()) return null;
  const usage = await cloudinary.api.usage();
  return {
    credits: usage.credits,
    storage: usage.storage,
    bandwidth: usage.bandwidth,
    transformations: usage.transformations,
    resources: usage.resources,
  };
}

export { cloudinary };
