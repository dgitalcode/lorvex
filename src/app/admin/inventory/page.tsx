import Link from "next/link";
import { AlertTriangle, Warehouse } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { InventoryAdjustForm } from "@/components/admin/inventory/inventory-adjust-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  await requirePermission("inventory.manage");

  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          currency: true,
          status: true,
          brand: { select: { name: true } },
          basePrice: true,
        },
      },
    },
    orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
  });

  const adjustOptions = variants.map((variant) => ({
    id: variant.id,
    label: `${variant.product.name} · ${variant.name} (${variant.sku})`,
    stock: variant.stock,
  }));

  const lowStock = variants.filter((variant) => variant.stock <= variant.lowStockAt);
  const outOfStock = variants.filter((variant) => variant.stock === 0);
  const totalUnits = variants.reduce((sum, variant) => sum + variant.stock, 0);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Inventory"
        description="Monitor variant stock levels and apply audited inventory adjustments."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Variants" value={variants.length.toLocaleString()} icon={Warehouse} />
        <StatCard label="Total units" value={totalUnits.toLocaleString()} />
        <StatCard
          label="Low stock"
          value={lowStock.length.toLocaleString()}
          hint="At or below threshold"
        />
        <StatCard label="Out of stock" value={outOfStock.length.toLocaleString()} />
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Adjust stock</h2>
        <InventoryAdjustForm variants={adjustOptions} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Variant levels</h2>
        <div className="overflow-hidden border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => {
                const isLow = variant.stock <= variant.lowStockAt;
                return (
                  <TableRow key={variant.id} className={isLow ? "bg-destructive/5" : undefined}>
                    <TableCell>
                      <Link
                        href={`/admin/products/${variant.product.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {variant.product.name}
                      </Link>
                    </TableCell>
                    <TableCell>{variant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{variant.sku}</TableCell>
                    <TableCell>{variant.product.brand.name}</TableCell>
                    <TableCell>
                      {formatPrice(
                        Number(variant.price ?? variant.product.basePrice),
                        variant.product.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          isLow
                            ? "inline-flex items-center gap-1 font-medium text-destructive tabular-nums"
                            : "tabular-nums"
                        }
                      >
                        {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                        {variant.stock}
                        <span className="text-xs text-muted-foreground">
                          / {variant.lowStockAt}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isLow ? "outline" : "muted"}>
                        {variant.product.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
