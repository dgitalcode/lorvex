"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const copy = {
  fr: {
    eyebrow: "Un instant d'arrêt",
    title: "Une pièce du mécanisme s'est enrayée.",
    body: "Nos horlogers sont prévenus. Réessayez, ou revenez à l'accueil de la maison.",
    retry: "Réessayer",
    home: "Retour à l'accueil",
  },
  en: {
    eyebrow: "A brief pause",
    title: "A part of the mechanism has stalled.",
    body: "Our watchmakers have been notified. Try again, or return to the house.",
    retry: "Try again",
    home: "Back to home",
  },
  ar: {
    eyebrow: "توقف قصير",
    title: "تعطل جزء من الآلية.",
    body: "تم إبلاغ صانعي الساعات لدينا. أعد المحاولة أو عد إلى الصفحة الرئيسية.",
    retry: "أعد المحاولة",
    home: "العودة إلى الرئيسية",
  },
} as const;

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const locale =
    params?.locale === "en" || params?.locale === "ar" ? params.locale : "fr";
  const t = copy[locale];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="luxury-container flex min-h-[80vh] flex-col items-center justify-center py-24 text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-accent">
        {t.eyebrow}
      </p>
      <h1 className="mt-5 max-w-2xl font-display text-4xl leading-tight text-balance md:text-6xl">
        {t.title}
      </h1>
      <p className="mt-5 max-w-md text-muted-foreground">{t.body}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Button size="lg" onClick={reset}>
          <RotateCcw />
          {t.retry}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/${locale}`}>{t.home}</Link>
        </Button>
      </div>
    </div>
  );
}
