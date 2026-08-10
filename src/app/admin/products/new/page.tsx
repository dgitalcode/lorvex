import { AdminBreadcrumb, AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/products/product-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";
import type { ProductFormInput } from "@/server/validations/admin/product";

export const metadata = { title: "New product" };

const defaultValues: ProductFormInput = {
  name: "",
  slug: "",
  sku: "",
  barcode: null,
  shortDescription: null,
  description: "",
  brandId: "",
  collectionId: null,
  categoryId: null,
  gender: "UNISEX",
  movement: "AUTOMATIC",
  status: "DRAFT",
  basePrice: 0,
  compareAtPrice: null,
  currency: "MAD",
  warrantyMonths: 24,
  isFeatured: false,
  isNewArrival: false,
  isBestSeller: false,
  isLimitedEdition: false,
  metaTitle: null,
  metaDescription: null,
  ogImage: null,
  variants: [
    {
      name: "Default variant",
      sku: "",
      stock: 0,
      lowStockAt: 3,
      isDefault: true,
      sortOrder: 0,
    },
  ],
  media: [],
  specifications: [],
  relations: [],
};

export default async function NewProductPage() {
  await requirePermission("products.edit");

  const [brands, collections, categories, relatedProducts] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.collection.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const values: ProductFormInput = {
    ...defaultValues,
    brandId: brands[0]?.id ?? "",
  };

  return (
    <div className="space-y-8">
      <div>
        <AdminBreadcrumb
          items={[
            { label: "Products", href: "/admin/products" },
            { label: "New product" },
          ]}
        />
        <AdminPageHeader
          eyebrow="Catalog"
          title="New product"
          description="Create a product with variants, media, specifications, and SEO metadata."
        />
      </div>
      <ProductForm
        mode="create"
        defaultValues={values}
        brands={brands}
        collections={collections}
        categories={categories}
        relatedProducts={relatedProducts}
      />
    </div>
  );
}
