import Link from "next/link";
import { Search } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/i18n/get-dictionary";
import { searchProducts, getBrands } from "@/server/repositories/catalog";

export const metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const q = (await searchParams).q?.trim() ?? "";
  const [result, brands] = await Promise.all([q ? searchProducts({ q, pageSize: 24 }) : Promise.resolve({ products: [], total: 0, page: 1, pageSize: 24, pageCount: 1 }), getBrands()]);
  return <div className="luxury-container pb-24 page-pad">
    <p className="text-[11px] uppercase tracking-[.24em] text-accent">Discover</p><h1 className="mt-2 font-display text-5xl">Search LORVEX</h1>
    <form className="mt-8 flex max-w-2xl gap-2"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} list="brand-suggestions" placeholder="Watch, brand or reference…" autoFocus className="h-13 pl-11" /><datalist id="brand-suggestions">{brands.map((brand) => <option key={brand.slug} value={brand.name} />)}</datalist></div><Button type="submit" size="lg">Search</Button></form>
    {q && <p className="mt-8 text-sm text-muted-foreground">{result.total} result{result.total === 1 ? "" : "s"} for “{q}”</p>}
    <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">{result.products.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>
    {q && !result.total && <div className="mt-16 border bg-card p-10 text-center"><h2 className="font-display text-3xl">No timepiece found</h2><p className="mt-2 text-muted-foreground">Try a brand, collection or reference number.</p><Link href={`/${locale}/shop`} className="mt-5 inline-block text-sm underline underline-offset-8">Browse the full collection</Link></div>}
  </div>;
}
