import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { localePageMetadata } from "@/lib/page-metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { buildFaqPageJsonLd } from "@/lib/json-ld";
import { getStorefrontFaq, storefrontCopy } from "@/content/storefront-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = storefrontCopy(locale);
  return localePageMetadata({
    locale,
    path: "/faq",
    title: copy.faqTitle,
    description: copy.faqDescription,
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = storefrontCopy(locale);
  const items = getStorefrontFaq(locale);
  const faqJsonLd = buildFaqPageJsonLd(items);
  return (
    <div className="luxury-container pb-24 page-pad">
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] uppercase tracking-[.24em] text-accent">
          {copy.faqEyebrow}
        </p>
        <h1 className="mt-3 font-display text-6xl">{copy.faqH1}</h1>
        <p className="mt-6 flex flex-wrap gap-6 text-sm">
          <Link href={`/${locale}/shop`} className="underline underline-offset-4">
            {copy.faqShop}
          </Link>
          <Link href={`/${locale}/contact`} className="underline underline-offset-4">
            {copy.faqContact}
          </Link>
        </p>
        <div className="mt-12 divide-y border-y">
          {items.map((item) => (
            <details key={item.id} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl">
                <span>{item.question}</span>
                <Plus className="h-5 w-5 shrink-0 transition group-open:rotate-45" />
              </summary>
              <p className="max-w-3xl pt-4 leading-7 text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
