import { notFound, redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/i18n/get-dictionary";
import { getSecurityStrings } from "@/i18n/auth-strings";
import { SecurityPanel } from "@/components/account/security-panel";

export const metadata = { title: "Security", robots: { index: false } };

export default async function AccountSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const t = getSecurityStrings(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/sign-in`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) {
    await signOut({ redirect: false }).catch(() => undefined);
    redirect(`/${locale}/auth/sign-in`);
  }

  return (
    <div className="luxury-container pb-24 page-pad">
      <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
        {t.eyebrow}
      </p>
      <h1 className="mt-2 font-display text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        {t.subtitle}
      </p>
      <div className="mt-10">
        <SecurityPanel locale={locale} />
      </div>
    </div>
  );
}
