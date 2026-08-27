import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { localePageMetadata } from "@/lib/page-metadata";
import { storefrontCopy } from "@/content/storefront-copy";

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
    path: "/about",
    title: copy.aboutTitle,
    description: copy.aboutDescription,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = storefrontCopy(locale);
  return (
    <div className="page-pad">
      <header className="luxury-container max-w-5xl text-center">
        <p className="text-[11px] uppercase tracking-[.25em] text-accent">
          {copy.aboutEyebrow}
        </p>
        <h1 className="mt-4 text-balance font-display text-6xl md:text-8xl">
          {copy.aboutH1}
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
          {copy.aboutLead}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
          <Link href={`/${locale}/shop`} className="underline underline-offset-4">
            {copy.aboutShop}
          </Link>
          <Link href={`/${locale}/contact`} className="underline underline-offset-4">
            {copy.aboutContact}
          </Link>
        </div>
      </header>
      <section className="luxury-container section-pad grid gap-12 md:grid-cols-3">
        {copy.aboutPillars.map((item) => (
          <article key={item.n} className="border-t pt-6">
            <span className="text-xs text-accent">{item.n}</span>
            <h2 className="mt-5 font-display text-3xl">{item.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
