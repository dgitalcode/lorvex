import Link from "next/link";
import { Heart, MapPin, Package, Shield, UserRound } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, isLocale } from "@/i18n/get-dictionary";
import { SignOutButton } from "@/components/account/sign-out-button";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const dictionary = getDictionary(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/sign-in`);

  const [orders, addresses] = await Promise.all([
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.address.count({ where: { userId: session.user.id } }),
  ]);

  const cards = [
    {
      href: "orders",
      icon: Package,
      title: dictionary.account.orders,
      value: `${orders} ${dictionary.account.orders.toLowerCase()}`,
    },
    {
      href: "wishlist",
      icon: Heart,
      title: dictionary.account.wishlist,
      value: dictionary.account.wishlist,
    },
    {
      href: "security",
      icon: Shield,
      title: dictionary.account.settings,
      value: "2FA · devices · history",
    },
    {
      href: "#",
      icon: MapPin,
      title: dictionary.account.addresses,
      value: `${addresses}`,
    },
  ];

  const name = session.user.name ?? "LORVEX client";

  return (
    <div className="luxury-container pb-24 page-pad">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[.24em] text-accent">
            {dictionary.account.privateArea}
          </p>
          <h1 className="mt-2 font-display text-5xl">
            {dictionary.account.welcome}, {name}
          </h1>
          {session.user.email ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {session.user.email}
            </p>
          ) : null}
        </div>
        <SignOutButton locale={locale} label={dictionary.account.signOut} />
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href === "#" ? "#" : `/${locale}/account/${card.href}`}
            className="border bg-card p-6 transition hover:border-accent"
          >
            <card.icon className="h-5 w-5 text-accent" />
            <h2 className="mt-5 font-display text-2xl">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 border bg-card p-7">
        <UserRound className="h-5 w-5 text-accent" />
        <h2 className="mt-4 font-display text-3xl">
          {dictionary.account.conciergeTitle}
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {dictionary.account.conciergeBody}
        </p>
      </div>
    </div>
  );
}
