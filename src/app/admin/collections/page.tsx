import { Boxes } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  CollectionsManager,
  type AdminCollectionRow,
} from "@/components/admin/catalog/collections-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  await requirePermission("products.edit");

  const collections = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const rows: AdminCollectionRow[] = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    coverUrl: collection.coverUrl,
    isLimited: collection.isLimited,
    isFeatured: collection.isFeatured,
    sortOrder: collection.sortOrder,
    productCount: collection._count.products,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Collections"
        description="Organize products into curated collections for the storefront."
        actions={<Boxes className="h-5 w-5 text-accent" aria-hidden />}
      />
      <CollectionsManager collections={rows} />
    </div>
  );
}
