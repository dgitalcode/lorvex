import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getDictionary, isLocale } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Secure checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).checkout;
  const methods = await prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="luxury-container pb-24 page-pad">
      <p className="text-[11px] uppercase tracking-[.24em] text-accent">{t.eyebrow}</p>
      <h1 className="mt-2 font-display text-5xl md:text-6xl">{t.title}</h1>
      <div className="mt-12">
        <CheckoutForm
          locale={locale}
          shippingMethods={methods.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: Number(m.price),
            estimatedDays: m.estimatedDays,
          }))}
        />
      </div>
    </div>
  );
}
