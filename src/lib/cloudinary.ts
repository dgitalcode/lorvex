import { v2 as cloudinary } from "cloudinary";

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

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

export function createSignedUploadParams(folder = "lorvex") {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret!);
  return {
    cloudName: cloudName!,
    apiKey: apiKey!,
    timestamp,
    folder,
    signature,
  };
}

export async function destroyCloudinaryAsset(publicId: string) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  return cloudinary.uploader.destroy(publicId);
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
