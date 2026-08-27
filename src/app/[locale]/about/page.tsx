import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { publicPageUrl } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: "Our maison",
    description: "Discover LORVEX, Morocco's destination for exceptional watchmaking.",
    alternates: { canonical: publicPageUrl(`/${locale}/about`) },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <div className="page-pad"><header className="luxury-container max-w-5xl text-center"><p className="text-[11px] uppercase tracking-[.25em] text-accent">The maison</p><h1 className="mt-4 text-balance font-display text-6xl md:text-8xl">Time, chosen with purpose.</h1><p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">LORVEX brings the world&apos;s most compelling watchmaking to Morocco through expert curation, uncompromising authenticity and discreet personal service.</p></header><section className="luxury-container section-pad grid gap-12 md:grid-cols-3">{[{ n: "01", t: "Authenticity", d: "Every timepiece is sourced through trusted channels, inspected by specialists and delivered with full provenance." }, { n: "02", t: "Curation", d: "We select watches for their design integrity, mechanical significance and enduring place in a considered collection." }, { n: "03", t: "Service", d: "From first consultation to long-term care, our concierge relationship continues well beyond delivery." }].map((item) => <article key={item.n} className="border-t pt-6"><span className="text-xs text-accent">{item.n}</span><h2 className="mt-5 font-display text-3xl">{item.t}</h2><p className="mt-3 leading-7 text-muted-foreground">{item.d}</p></article>)}</section></div>;
}
