import { Tags } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  BrandsManager,
  type AdminBrandRow,
} from "@/components/admin/catalog/brands-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  await requirePermission("products.edit");

  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const rows: AdminBrandRow[] = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    country: brand.country,
    isFeatured: brand.isFeatured,
    sortOrder: brand.sortOrder,
    productCount: brand._count.products,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Brands"
        description="Manage watch brands used across the product catalog."
        actions={<Tags className="h-5 w-5 text-accent" aria-hidden />}
      />
      <BrandsManager brands={rows} />
    </div>
  );
}
