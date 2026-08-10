import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/product/print-button";
import { isLocale } from "@/i18n/get-dictionary";
import { getProductBySlug } from "@/server/repositories/catalog";
import { formatPrice } from "@/lib/format";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Fiche technique`,
    robots: { index: false },
  };
}

export default async function ProductSpecsPage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const image = product.media.find((item) => item.type === "IMAGE");
  const groups = [...new Set(product.specifications.map((s) => s.group))];
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0];

  const backLabel =
    localeParam === "en"
      ? "Back to product"
      : localeParam === "ar"
        ? "العودة إلى المنتج"
        : "Retour au produit";
  const printLabel =
    localeParam === "en"
      ? "Print / Save as PDF"
      : localeParam === "ar"
        ? "طباعة / حفظ PDF"
        : "Imprimer / Enregistrer en PDF";

  return (
    <div className="page-pad pb-24 print:pt-0 print:pb-0">
      <div className="luxury-container max-w-3xl">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/${localeParam}/product/${slug}`}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {backLabel}
          </Link>
          <PrintButton label={printLabel} />
        </div>

        <header className="mt-10 border-b border-border pb-8 print:mt-0">
          <p className="font-display text-2xl tracking-[0.3em]">LORVEX</p>
          <div className="mt-8 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {product.brand.name}
              </p>
              <h1 className="mt-2 font-display text-4xl leading-tight">
                {product.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Réf. {product.sku}
                {product.collection ? ` · ${product.collection.name}` : ""}
              </p>
              <p className="mt-4 text-xl tabular-nums">
                {formatPrice(Number(product.basePrice), product.currency)}
              </p>
            </div>
            {image && (
              <div className="relative h-36 w-36 shrink-0 overflow-hidden border border-border bg-secondary">
                <Image
                  src={image.url}
                  alt={product.name}
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </header>

        <section className="mt-8">
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            {product.shortDescription ?? product.description}
          </p>
        </section>

        {defaultVariant && (
          <section className="mt-8">
            <h2 className="text-xs uppercase tracking-[0.2em] text-accent">
              Configuration
            </h2>
            <dl className="mt-4 grid gap-x-12 gap-y-2 sm:grid-cols-2">
              {[
                ["SKU", defaultVariant.sku],
                ["Cadran", defaultVariant.dialColor],
                ["Bracelet", defaultVariant.strapMaterial],
                ["Boîtier", defaultVariant.caseMaterial],
                [
                  "Diamètre",
                  defaultVariant.caseSizeMm
                    ? `${Number(defaultVariant.caseSizeMm)} mm`
                    : null,
                ],
                [
                  "Étanchéité",
                  defaultVariant.waterResistanceM
                    ? `${defaultVariant.waterResistanceM} m`
                    : null,
                ],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}

        {groups.map((group) => (
          <section key={group} className="mt-8">
            <h2 className="text-xs uppercase tracking-[0.2em] text-accent">
              {group}
            </h2>
            <dl className="mt-4 grid gap-x-12 gap-y-2 sm:grid-cols-2">
              {product.specifications
                .filter((s) => s.group === group)
                .map((spec) => (
                  <div
                    key={spec.id}
                    className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm"
                  >
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Garantie LORVEX {product.warrantyMonths} mois · Authenticité
            certifiée · concierge@lorvex.ma
          </p>
        </footer>
      </div>
    </div>
  );
}
