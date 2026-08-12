"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { LegalDocument } from "@/content/legal";
import type { Locale } from "@/config/site";

export function LegalDocumentView({
  locale,
  legal,
  updatedAt,
  alternateSlug,
  alternateLabel,
}: {
  locale: Locale;
  legal: LegalDocument;
  updatedAt: string;
  alternateSlug: "privacy" | "terms";
  alternateLabel: string;
}) {
  const [activeId, setActiveId] = useState(legal.sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = legal.sections
      .map((section) => window.document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActiveId(top);
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [legal]);

  return (
    <div className="page-pad pb-24">
      <header className="luxury-container max-w-5xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
          {legal.eyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl text-balance font-display text-5xl md:text-7xl">
          {legal.title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
          {legal.intro}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>
            {legal.updatedLabel}: {updatedAt}
          </span>
          <Link
            href={`/${locale}/legal/${alternateSlug}`}
            className="text-foreground transition-colors hover:text-accent"
          >
            {alternateLabel}
          </Link>
        </div>
      </header>

      <div className="luxury-container mt-14 grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav
            aria-label={legal.tocLabel}
            className="sticky top-[calc(var(--header-height,5rem)+1.5rem)] max-h-[calc(100dvh-var(--header-height,5rem)-3rem)] overflow-y-auto border-s border-border/70 ps-4"
          >
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {legal.tocLabel}
            </p>
            <ul className="space-y-2">
              {legal.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      "block text-sm leading-snug transition-colors",
                      activeId === section.id
                        ? "text-accent"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <nav
            aria-label={legal.tocLabel}
            className="mb-10 border border-border/80 bg-card/60 p-5 lg:hidden"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {legal.tocLabel}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {legal.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {legal.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-[calc(var(--header-height,5rem)+1.25rem)] border-t border-border/70 pt-8"
              >
                <h2 className="font-display text-3xl md:text-4xl">
                  {section.title}
                </h2>
                <div className="mt-5 space-y-4 text-[15px] leading-8 text-muted-foreground">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.id}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 border border-border/80 bg-card p-7 md:p-9">
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
              {legal.contactHeading}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              {legal.sections.at(-1)?.paragraphs[0]}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
