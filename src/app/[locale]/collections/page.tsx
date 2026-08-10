import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Collections" };

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const collections = await prisma.collection.findMany({ include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] });
  return <div className="luxury-container pb-24 page-pad"><p className="text-[11px] uppercase tracking-[.24em] text-accent">Curated worlds</p><h1 className="mt-2 font-display text-5xl md:text-6xl">Collections</h1><div className="mt-12 grid gap-7 md:grid-cols-2">{collections.map((collection) => <Link key={collection.id} href={`/${locale}/collections/${collection.slug}`} className="group relative aspect-[16/10] overflow-hidden bg-secondary">{collection.coverUrl ? <Image src={collection.coverUrl} alt={collection.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white"><p className="text-[10px] uppercase tracking-[.2em] text-white/65">{collection._count.products} timepieces</p><h2 className="mt-2 font-display text-4xl">{collection.name}</h2>{collection.description && <p className="mt-2 max-w-lg text-sm text-white/75">{collection.description}</p>}</div></Link>)}</div></div>;
}
