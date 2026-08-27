import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { siteConfig } from "@/config/site";
import { localeAlternates, ogLocale } from "@/lib/i18n-seo";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteAssetUrl, buildFaqPageJsonLd } from "@/lib/json-ld";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const alternates = localeAlternates(locale, "/faq");
  return {
    title: "Frequently asked questions",
    description: siteConfig.description[locale],
    alternates,
    openGraph: {
      url: alternates.canonical,
      locale: ogLocale(locale),
      images: [absoluteAssetUrl("/images/lorvex/hero.jpg")],
    },
  };
}

const defaults = [
  { id: "authenticity", category: "Watches", question: "Are all LORVEX watches authentic?", answer: "Yes. Every watch is sourced through trusted channels, inspected before dispatch and supplied with its applicable warranty and provenance." },
  { id: "delivery", category: "Delivery", question: "Where do you deliver?", answer: "We provide insured delivery across Morocco. Casablanca orders typically arrive within three to five business days." },
  { id: "payment", category: "Payment", question: "Which payment methods are available?", answer: "Cash on delivery and card payment are available at checkout. Our concierge can assist with exceptional-value transactions." },
  { id: "returns", category: "After-sales", question: "Can I return a watch?", answer: "Contact our concierge promptly after delivery. Returns are assessed according to condition, seals, documentation and the terms supplied with your order." },
];

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const stored = await prisma.faqItem.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const items = stored.length ? stored : defaults;
  const faqJsonLd = buildFaqPageJsonLd(items);
  return <div className="luxury-container pb-24 page-pad"><JsonLd data={faqJsonLd} /><div className="mx-auto max-w-4xl"><p className="text-[11px] uppercase tracking-[.24em] text-accent">Client services</p><h1 className="mt-3 font-display text-6xl">Frequently asked questions</h1><div className="mt-12 divide-y border-y">{items.map((item) => <details key={item.id} className="group py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl"><span>{item.question}</span><Plus className="h-5 w-5 shrink-0 transition group-open:rotate-45" /></summary><p className="max-w-3xl pt-4 leading-7 text-muted-foreground">{item.answer}</p></details>)}</div></div></div>;
}
