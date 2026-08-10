"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { createProduct, updateProduct } from "@/server/actions/admin/products";
import {
  createProductSchema,
  type ProductFormInput,
} from "@/server/validations/admin/product";

type Option = { id: string; name: string };
type RelatedOption = { id: string; name: string; sku: string };

type Props = {
  mode: "create" | "edit";
  productId?: string;
  defaultValues: ProductFormInput;
  brands: Option[];
  collections: Option[];
  categories: Option[];
  relatedProducts: RelatedOption[];
};

const NONE = "__none__";

export function ProductForm({
  mode,
  productId,
  defaultValues,
  brands,
  collections,
  categories,
  relatedProducts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(createProductSchema) as Resolver<ProductFormInput>,
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const variants = useFieldArray({ control, name: "variants" });
  const media = useFieldArray({ control, name: "media" });
  const specifications = useFieldArray({ control, name: "specifications" });
  const relations = useFieldArray({ control, name: "relations" });

  const nameValue = watch("name");

  function autoSlug() {
    if (nameValue) setValue("slug", slugify(nameValue), { shouldDirty: true });
  }

  async function uploadMedia(index: number, file: File) {
    try {
      const signRes = await fetch("/api/admin/cloudinary/sign");
      if (!signRes.ok) throw new Error("Upload not configured");
      const sign = (await signRes.json()) as {
        cloudName: string;
        apiKey: string;
        timestamp: number;
        folder: string;
        signature: string;
      };
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sign.apiKey);
      body.append("timestamp", String(sign.timestamp));
      body.append("folder", sign.folder);
      body.append("signature", sign.signature);
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`,
        { method: "POST", body },
      );
      if (!uploadRes.ok) throw new Error("Upload failed");
      const payload = (await uploadRes.json()) as { secure_url?: string; public_id?: string };
      if (!payload.secure_url) throw new Error("Upload failed");
      setValue(`media.${index}.url`, payload.secure_url, { shouldDirty: true });
      if (payload.public_id) {
        setValue(`media.${index}.publicId`, payload.public_id, { shouldDirty: true });
      }
      toast.success("Media uploaded");
    } catch {
      toast.error("Cloudinary upload unavailable. Paste a URL instead.");
    }
  }

  function onSubmit(values: ProductFormInput) {
    startTransition(async () => {
      const payload =
        mode === "edit" && productId ? { ...values, id: productId } : values;
      const result =
        mode === "edit" && productId
          ? await updateProduct(payload as ProductFormInput & { id: string })
          : await createProduct(values);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "edit" ? "Product updated" : "Product created");
      router.push(`/admin/products/${result.id ?? productId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-28">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/40 p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} onBlur={autoSlug} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...register("slug")} />
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} />
              {errors.sku && (
                <p className="text-xs text-destructive">{errors.sku.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" {...register("barcode")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea id="shortDescription" rows={2} {...register("shortDescription")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={6} {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={watch("brandId")}
                onValueChange={(value) => setValue("brandId", value, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Collection</Label>
              <Select
                value={watch("collectionId") ?? NONE}
                onValueChange={(value) =>
                  setValue("collectionId", value === NONE ? null : value, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={watch("categoryId") ?? NONE}
                onValueChange={(value) =>
                  setValue("categoryId", value === NONE ? null : value, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={watch("gender")}
                onValueChange={(value) =>
                  setValue("gender", value as ProductFormInput["gender"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["MEN", "WOMEN", "UNISEX"] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Movement</Label>
              <Select
                value={watch("movement")}
                onValueChange={(value) =>
                  setValue("movement", value as ProductFormInput["movement"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["AUTOMATIC", "MANUAL", "QUARTZ", "SPRING_DRIVE", "SMART"] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(value) =>
                  setValue("status", value as ProductFormInput["status"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["isFeatured", "Featured"],
                ["isNewArrival", "New arrival"],
                ["isBestSeller", "Best seller"],
                ["isLimitedEdition", "Limited edition"],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="flex items-center justify-between border border-border px-4 py-3"
              >
                <span className="text-sm">{label}</span>
                <Switch
                  checked={watch(field)}
                  onCheckedChange={(checked) => setValue(field, checked, { shouldDirty: true })}
                />
              </label>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base price</Label>
            <Input id="basePrice" type="number" step="0.01" {...register("basePrice")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compareAtPrice">Compare at price</Label>
            <Input
              id="compareAtPrice"
              type="number"
              step="0.01"
              {...register("compareAtPrice")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" maxLength={3} {...register("currency")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warrantyMonths">Warranty (months)</Label>
            <Input id="warrantyMonths" type="number" {...register("warrantyMonths")} />
          </div>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          {errors.variants?.message && (
            <p className="text-sm text-destructive">{String(errors.variants.message)}</p>
          )}
          {variants.fields.map((field, index) => (
            <div key={field.id} className="space-y-3 border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Variant {index + 1}</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={watch(`variants.${index}.isDefault`)}
                      onCheckedChange={(checked) => {
                        variants.fields.forEach((_, i) =>
                          setValue(`variants.${i}.isDefault`, false, { shouldDirty: true }),
                        );
                        setValue(`variants.${index}.isDefault`, Boolean(checked), {
                          shouldDirty: true,
                        });
                      }}
                    />
                    Default
                  </label>
                  {variants.fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => variants.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {watch(`variants.${index}.id`) && (
                <input type="hidden" {...register(`variants.${index}.id`)} />
              )}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Input placeholder="Name" {...register(`variants.${index}.name`)} />
                <Input placeholder="SKU" {...register(`variants.${index}.sku`)} />
                <Input placeholder="Barcode" {...register(`variants.${index}.barcode`)} />
                <Input placeholder="Color" {...register(`variants.${index}.color`)} />
                <Input placeholder="Dial color" {...register(`variants.${index}.dialColor`)} />
                <Input
                  placeholder="Strap material"
                  {...register(`variants.${index}.strapMaterial`)}
                />
                <Input
                  placeholder="Case material"
                  {...register(`variants.${index}.caseMaterial`)}
                />
                <Input
                  placeholder="Case size (mm)"
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.caseSizeMm`)}
                />
                <Input
                  placeholder="Water resistance (m)"
                  type="number"
                  {...register(`variants.${index}.waterResistanceM`)}
                />
                <Input
                  placeholder="Price"
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.price`)}
                />
                <Input
                  placeholder="Stock"
                  type="number"
                  {...register(`variants.${index}.stock`)}
                />
                <Input placeholder="Image URL" {...register(`variants.${index}.imageUrl`)} />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              variants.append({
                name: "",
                sku: `${watch("sku") || "SKU"}-${variants.fields.length + 1}`,
                stock: 0,
                lowStockAt: 3,
                isDefault: variants.fields.length === 0,
                sortOrder: variants.fields.length,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add variant
          </Button>
        </TabsContent>

        <TabsContent value="specs" className="space-y-4">
          {specifications.fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Group" {...register(`specifications.${index}.group`)} />
              <Input placeholder="Label" {...register(`specifications.${index}.label`)} />
              <Input placeholder="Value" {...register(`specifications.${index}.value`)} />
              <Button type="button" variant="ghost" onClick={() => specifications.remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              specifications.append({
                group: "General",
                label: "",
                value: "",
                sortOrder: specifications.fields.length,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add specification
          </Button>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          {media.fields.map((field, index) => (
            <div key={field.id} className="space-y-3 border border-border p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Media URL" {...register(`media.${index}.url`)} />
                <Select
                  value={watch(`media.${index}.type`)}
                  onValueChange={(value) =>
                    setValue(
                      `media.${index}.type`,
                      value as ProductFormInput["media"][number]["type"],
                      { shouldDirty: true },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["IMAGE", "VIDEO", "SPIN_360"] as const).map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Alt text" {...register(`media.${index}.alt`)} />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={watch(`media.${index}.isPrimary`)}
                    onCheckedChange={(checked) =>
                      setValue(`media.${index}.isPrimary`, Boolean(checked), {
                        shouldDirty: true,
                      })
                    }
                  />
                  Primary
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <Upload className="h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadMedia(index, file);
                    }}
                  />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => media.remove(index)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              media.append({
                url: "",
                type: "IMAGE",
                isPrimary: media.fields.length === 0,
                sortOrder: media.fields.length,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add media
          </Button>
        </TabsContent>

        <TabsContent value="seo" className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="metaTitle">Meta title</Label>
            <Input id="metaTitle" {...register("metaTitle")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="metaDescription">Meta description</Label>
            <Textarea id="metaDescription" rows={3} {...register("metaDescription")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ogImage">OG image URL</Label>
            <Input id="ogImage" {...register("ogImage")} />
          </div>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
          {relations.fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 md:grid-cols-3">
              <Select
                value={watch(`relations.${index}.relatedId`)}
                onValueChange={(value) =>
                  setValue(`relations.${index}.relatedId`, value, { shouldDirty: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Related product" />
                </SelectTrigger>
                <SelectContent>
                  {relatedProducts
                    .filter((item) => item.id !== productId)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                value={watch(`relations.${index}.type`)}
                onValueChange={(value) =>
                  setValue(
                    `relations.${index}.type`,
                    value as ProductFormInput["relations"][number]["type"],
                    { shouldDirty: true },
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["RELATED", "FREQUENTLY_BOUGHT", "ALTERNATIVE", "UPSELL"] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" onClick={() => relations.remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              relations.append({
                relatedId: relatedProducts[0]?.id ?? "",
                type: "RELATED",
                sortOrder: relations.fields.length,
              })
            }
            disabled={!relatedProducts.length}
          >
            <Plus className="mr-2 h-4 w-4" /> Add relation
          </Button>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-4 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {mode === "edit" ? "Editing product" : "Creating product"}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create product"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
