import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-24 text-center">
      <p className="font-display text-[clamp(6rem,18vw,12rem)] leading-none tracking-tight text-border">
        404
      </p>
      <p className="-mt-4 text-[11px] uppercase tracking-[0.28em] text-accent">
        {siteConfig.name}
      </p>
      <h1 className="mt-6 max-w-xl font-display text-3xl leading-tight text-balance md:text-5xl">
        Cette page a quitté la vitrine.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        This page has left the showcase. · هذه الصفحة غادرت الواجهة.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/fr">Accueil</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/fr/shop">Boutique</Link>
        </Button>
      </div>
    </div>
  );
}
