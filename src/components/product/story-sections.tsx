"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Cog,
  Droplets,
  Gem,
  Package,
  Plus,
  Ruler,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { ImageReveal } from "@/components/luxury/image-reveal";
import { getPdpStrings } from "@/components/product/strings";
import type { PdpProduct, PdpVariant } from "@/components/product/types";
import type { Locale } from "@/config/site";
import { cn } from "@/lib/utils";

const PACKAGING_IMAGE = "/images/lorvex/packaging.jpg";
const CRAFT_IMAGE = "/images/lorvex/movement.jpg";

type SpecRow = { label: string; value: string };

function groupRows(product: PdpProduct, groups: string[]): SpecRow[] {
  return product.specifications
    .filter((s) => groups.includes(s.group))
    .map((s) => ({ label: s.label, value: s.value }));
}

function dedupe(rows: SpecRow[]): SpecRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.label)) return false;
    seen.add(row.label);
    return true;
  });
}

export function StorySections({
  product,
  selected,
  locale,
  faqItems,
}: {
  product: PdpProduct;
  selected: PdpVariant;
  locale: Locale;
  faqItems: { id: string; question: string; answer: string }[];
}) {
  const t = getPdpStrings(locale);

  const movementLabel =
    product.movement === "AUTOMATIC"
      ? locale === "en"
        ? "Automatic"
        : locale === "ar"
          ? "أوتوماتيكية"
          : "Automatique"
      : product.movement === "MANUAL"
        ? locale === "en"
          ? "Hand-wound"
          : locale === "ar"
            ? "تعبئة يدوية"
            : "Remontage manuel"
        : "Quartz";

  const panels: {
    icon: LucideIcon;
    title: string;
    rows: SpecRow[];
  }[] = [
    {
      icon: Cog,
      title: t.movementSection,
      rows: dedupe([
        { label: "Type", value: movementLabel },
        ...groupRows(product, ["Movement"]),
      ]),
    },
    {
      icon: Gem,
      title: t.materials,
      rows: dedupe([
        ...(selected.caseMaterial
          ? [{ label: t.caseSize, value: selected.caseMaterial }]
          : []),
        ...(selected.strapMaterial
          ? [{ label: t.strap, value: selected.strapMaterial }]
          : []),
        ...groupRows(product, ["Case", "Glass"]),
      ]),
    },
    {
      icon: Ruler,
      title: t.dimensions,
      rows: dedupe([
        ...(selected.caseSizeMm
          ? [{ label: "Ø", value: `${selected.caseSizeMm} mm` }]
          : []),
        ...groupRows(product, ["Dimensions"]).length
          ? groupRows(product, ["Dimensions"])
          : product.specifications
              .filter((s) => s.label.toLowerCase().includes("épaisseur"))
              .map((s) => ({ label: s.label, value: s.value })),
      ]),
    },
    {
      icon: Droplets,
      title: t.waterResistance,
      rows: dedupe([
        ...(selected.waterResistanceM
          ? [{ label: "ISO 22810", value: `${selected.waterResistanceM} m` }]
          : []),
        ...groupRows(product, ["Water"]),
      ]),
    },
    {
      icon: Award,
      title: t.warrantySection,
      rows: dedupe([
        { label: "LORVEX", value: t.warranty(product.warrantyMonths) },
        ...groupRows(product, ["Warranty"]),
      ]),
    },
  ].filter((panel) => panel.rows.length > 0);

  return (
    <>
      <section className="section-pad border-t border-border/60">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <ImageReveal
            src={CRAFT_IMAGE}
            alt={t.craftsmanship}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-[4/5] w-full"
          />
          <FadeIn>
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
              {t.craftsmanship}
            </p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-balance md:text-5xl">
              {product.brandName}
            </h2>
            <p className="mt-6 leading-8 text-muted-foreground">
              {product.description}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="pb-6">
        <Stagger className="grid gap-px border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <StaggerItem
              key={panel.title}
              className="bg-background p-8 transition-colors duration-500 hover:bg-secondary/40"
            >
              <panel.icon
                className="h-5 w-5 text-accent"
                strokeWidth={1.5}
              />
              <h3 className="mt-5 text-xs uppercase tracking-[0.2em]">
                {panel.title}
              </h3>
              <dl className="mt-4 space-y-2.5">
                {panel.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </StaggerItem>
          ))}
          <StaggerItem className="relative min-h-56 overflow-hidden bg-background">
            <Image
              src={PACKAGING_IMAGE}
              alt={t.packaging}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/90">
                <Package className="h-4 w-4" /> {t.packaging}
              </span>
            </span>
          </StaggerItem>
        </Stagger>
        <FadeIn className="mt-6 max-w-2xl">
          <p className="text-sm leading-7 text-muted-foreground">
            {t.packagingBody}
          </p>
        </FadeIn>
      </section>

      {faqItems.length > 0 && (
        <section className="section-pad-sm">
          <FadeIn>
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
              FAQ
            </p>
            <h2 className="mt-2 font-display text-4xl">{t.faq}</h2>
          </FadeIn>
          <FaqAccordion items={faqItems} />
        </section>
      )}
    </>
  );
}

export function FaqAccordion({
  items,
}: {
  items: { id: string; question: string; answer: string }[];
}) {
  const reduce = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-8 border-t border-border/80">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="border-b border-border/80">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-accent"
            >
              <span className="font-display text-xl md:text-2xl">
                {item.question}
              </span>
              <motion.span
                animate={reduce ? undefined : { rotate: open ? 45 : 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0"
              >
                <Plus className={cn("h-4 w-4", open && "text-accent")} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-6 leading-7 text-muted-foreground">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
