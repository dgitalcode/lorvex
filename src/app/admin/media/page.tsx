import { prisma } from "@/lib/prisma";
import {
  getCloudinaryConfigStatus,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { requirePermission } from "@/server/auth/require-admin";
import { MediaLibrary } from "@/components/admin/media/media-library";

export const metadata = { title: "Media library" };

export default async function AdminMediaPage() {
  await requirePermission("media.manage");

  const [assets, cloudinaryStatus] = await Promise.all([
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    Promise.resolve(getCloudinaryConfigStatus()),
  ]);

  return (
    <MediaLibrary
      assets={assets.map((asset) => ({
        ...asset,
        createdAt: asset.createdAt.toISOString(),
      }))}
      cloudinaryConfigured={isCloudinaryConfigured()}
      missingConfig={cloudinaryStatus.missing}
    />
  );
}
