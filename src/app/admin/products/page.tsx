import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyAdmin } from "@/components/admin/empty-admin";
import { StatCard } from "@/components/admin/stat-card";
import {
  ProductsTable,
  type AdminProductRow,
} from "@/components/admin/products/products-table";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requirePermission("products.view");

  const products = await prisma.product.findMany({
    include: {
      brand: { select: { name: true } },
      variants: { select: { stock: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: AdminProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    status: product.status,
    currency: product.currency,
    basePrice: Number(product.basePrice),
    brandName: product.brand.name,
    totalStock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
  }));

  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const lowStockCount = rows.filter((row) => row.totalStock <= 3).length;
  const draftCount = rows.filter((row) => row.status === "DRAFT").length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Products"
        description="Manage catalog items, variants, media, and publishing status."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" /> New product
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total products" value={rows.length.toLocaleString()} icon={Package} />
        <StatCard label="Active" value={activeCount.toLocaleString()} hint="Published catalog" />
        <StatCard label="Draft" value={draftCount.toLocaleString()} />
        <StatCard
          label="Low stock"
          value={lowStockCount.toLocaleString()}
          hint="≤ 3 units total"
        />
      </div>

      {rows.length ? (
        <ProductsTable products={rows} />
      ) : (
        <EmptyAdmin
          icon={Package}
          title="No products yet"
          description="Create your first product to start selling on LORVEX."
          actionLabel="Create product"
          actionHref="/admin/products/new"
        />
      )}
    </div>
  );
}
