import { notFound } from "next/navigation";
import { AdminBreadcrumb, AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/products/product-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";
import type { ProductFormInput } from "@/server/validations/admin/product";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: product ? `Edit ${product.name}` : "Edit product" };
}

function toFormInput(product: NonNullable<Awaited<ReturnType<typeof loadProduct>>>): ProductFormInput {
  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode,
    shortDescription: product.shortDescription,
    description: product.description,
    brandId: product.brandId,
    collectionId: product.collectionId,
    categoryId: product.categoryId,
    gender: product.gender,
    movement: product.movement,
    status: product.status,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    currency: product.currency,
    warrantyMonths: product.warrantyMonths,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    isLimitedEdition: product.isLimitedEdition,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    ogImage: product.ogImage,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      color: variant.color,
      dialColor: variant.dialColor,
      strapMaterial: variant.strapMaterial,
      caseMaterial: variant.caseMaterial,
      caseSizeMm: variant.caseSizeMm ? Number(variant.caseSizeMm) : null,
      waterResistanceM: variant.waterResistanceM,
      price: variant.price ? Number(variant.price) : null,
      compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
      stock: variant.stock,
      lowStockAt: variant.lowStockAt,
      imageUrl: variant.imageUrl,
      isDefault: variant.isDefault,
      sortOrder: variant.sortOrder,
    })),
    media: product.media.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.type,
      alt: item.alt,
      publicId: item.publicId,
      isPrimary: item.isPrimary,
      sortOrder: item.sortOrder,
    })),
    specifications: product.specifications.map((spec) => ({
      id: spec.id,
      group: spec.group,
      label: spec.label,
      value: spec.value,
      sortOrder: spec.sortOrder,
    })),
    relations: product.relatedFrom.map((relation) => ({
      relatedId: relation.relatedId,
      type: relation.type,
      sortOrder: relation.sortOrder,
    })),
  };
}

async function loadProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      media: { orderBy: { sortOrder: "asc" } },
      specifications: { orderBy: { sortOrder: "asc" } },
      relatedFrom: { orderBy: { sortOrder: "asc" } },
    },
  });
}

async function loadFormOptions(currentProductId?: string) {
  const [brands, collections, categories, relatedProducts] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.collection.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: currentProductId ? { id: { not: currentProductId } } : undefined,
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { brands, collections, categories, relatedProducts };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("products.edit");
  const { id } = await params;

  const [product, options] = await Promise.all([loadProduct(id), loadFormOptions(id)]);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <div>
        <AdminBreadcrumb
          items={[
            { label: "Products", href: "/admin/products" },
            { label: product.name },
          ]}
        />
        <AdminPageHeader
          eyebrow="Catalog"
          title={product.name}
          description={`SKU ${product.sku} · ${product.status.replaceAll("_", " ")}`}
        />
      </div>
      <ProductForm
        mode="edit"
        productId={product.id}
        defaultValues={toFormInput(product)}
        brands={options.brands}
        collections={options.collections}
        categories={options.categories}
        relatedProducts={options.relatedProducts}
      />
    </div>
  );
}
