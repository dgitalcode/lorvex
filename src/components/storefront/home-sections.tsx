import Link from "next/link";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { CinematicHero, type CinematicHeroContent } from "@/components/luxury/cinematic-hero";
import { ImageReveal } from "@/components/luxury/image-reveal";
import { HorizontalScroll } from "@/components/luxury/horizontal-scroll";
import { Magnetic } from "@/components/luxury/magnetic";
import { TextReveal } from "@/components/luxury/text-reveal";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";

export function HeroSection({
  locale,
  dictionary,
  content,
}: {
  locale: Locale;
  dictionary: Dictionary;
  content?: CinematicHeroContent;
}) {
  return (
    <CinematicHero locale={locale} dictionary={dictionary} content={content} />
  );
}

export function HorizontalProductRail({
  locale,
  title,
  products,
}: {
  locale: Locale;
  title: string;
  products: ProductCardData[];
}) {
  if (!products.length) return null;
  return (
    <HorizontalScroll title={title} className="bg-secondary/20">
      {products.map((product) => (
        <div key={product.id} className="w-[72vw] max-w-[340px] shrink-0 md:w-[320px]">
          <ProductCard product={product} locale={locale} />
        </div>
      ))}
    </HorizontalScroll>
  );
}

export function ProductRail({
  locale,
  title,
  subtitle,
  href,
  products,
  viewAllLabel,
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  href: string;
  products: ProductCardData[];
  viewAllLabel: string;
}) {
  if (!products.length) return null;
  return (
    <section className="section-pad">
      <div className="luxury-container">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <FadeIn>
              <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-[3.25rem]">
                {title}
              </h2>
            </FadeIn>
            {subtitle && (
              <FadeIn delay={0.08}>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                  {subtitle}
                </p>
              </FadeIn>
            )}
          </div>
          <Link
            href={href}
            className="hidden text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-accent md:inline"
          >
            {viewAllLabel}
          </Link>
        </div>
        <Stagger className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} locale={locale} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function CollectionsSection({
  locale,
  title,
  collections,
}: {
  locale: Locale;
  title: string;
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverUrl: string | null;
  }[];
}) {
  if (!collections.length) return null;
  return (
    <section className="section-pad bg-secondary/40">
      <div className="luxury-container">
        <FadeIn>
          <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
        </FadeIn>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <FadeIn key={collection.id} delay={index * 0.08}>
              <Link
                href={`/${locale}/collections/${collection.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden border border-border/40 bg-muted hover-lift"
              >
                {collection.coverUrl && (
                  <ImageReveal
                    src={collection.coverUrl}
                    alt={collection.name}
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-display text-3xl">{collection.name}</h3>
                  {collection.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {collection.description}
                    </p>
                  )}
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyChooseUs({ title }: { title: string }) {
  const items = [
    {
      title: "Authenticité",
      body: "Chaque pièce est authentifiée par nos experts horlogers.",
    },
    {
      title: "Conciergerie",
      body: "Un accompagnement privé, de la sélection à la livraison.",
    },
    {
      title: "Garantie maison",
      body: "Couverture étendue et service après-vente dédié au Maroc.",
    },
    {
      title: "Livraison sécurisée",
      body: "Emballage muséal et transport assuré partout au Royaume.",
    },
  ];

  return (
    <section className="section-pad">
      <div className="luxury-container">
        <FadeIn>
          <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
        </FadeIn>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <div className="border-t border-border pt-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
                  0{i + 1}
                </p>
                <h3 className="mt-3 font-display text-2xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection({
  title,
}: {
  title: string;
}) {
  const stats = [
    { value: "120+", label: "Références exclusives" },
    { value: "15", label: "Maisons partenaires" },
    { value: "98%", label: "Clients satisfaits" },
    { value: "24/7", label: "Conciergerie" },
  ];
  return (
    <section className="border-y border-border bg-primary text-primary-foreground">
      <div className="luxury-container py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
        <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-4xl md:text-5xl">{stat.value}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BrandStory({
  locale,
  title,
}: {
  locale: Locale;
  title: string;
}) {
  return (
    <section className="section-pad">
      <div className="luxury-container grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <ImageReveal
            src="/images/lorvex/atelier.jpg"
            alt="LORVEX atelier — craftsmanship and fine watchmaking"
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <FadeIn delay={0.12}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {siteConfig.name}
          </p>
          <TextReveal className="mt-4 font-display text-4xl md:text-5xl">
            {title}
          </TextReveal>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {siteConfig.description[locale]}
          </p>
          <Magnetic className="mt-8">
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/about`}>Découvrir la maison</Link>
            </Button>
          </Magnetic>
        </FadeIn>
      </div>
    </section>
  );
}

export function TestimonialsSection({
  title,
  testimonials,
}: {
  title: string;
  testimonials: {
    id: string;
    name: string;
    role: string | null;
    city: string | null;
    body: string;
    rating: number;
  }[];
}) {
  if (!testimonials.length) return null;
  return (
    <section className="section-pad bg-secondary/30">
      <div className="luxury-container">
        <FadeIn>
          <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <FadeIn key={item.id} delay={i * 0.08}>
              <blockquote className="h-full border border-border bg-card p-8">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  “{item.body}”
                </p>
                <footer className="mt-8">
                  <p className="font-display text-xl">{item.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {[item.role, item.city].filter(Boolean).join(" · ")}
                  </p>
                </footer>
              </blockquote>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InstagramSection({
  title,
}: {
  title: string;
}) {
  const images = [
    "/images/lorvex/lifestyle-01.jpg",
    "/images/lorvex/lifestyle-02.jpg",
    "/images/lorvex/lifestyle-03.jpg",
    "/images/lorvex/lifestyle-04.jpg",
  ];
  return (
    <section className="section-pad">
      <div className="luxury-container">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-accent"
          >
            @lorvex
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((src, index) => (
            <a
              key={src}
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="relative aspect-square overflow-hidden bg-muted"
            >
              <ImageReveal
                src={src}
                alt={`LORVEX lifestyle ${index + 1}`}
                sizes="25vw"
                className="absolute inset-0"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewsletterSection({
  locale,
  title,
}: {
  locale: Locale;
  title: string;
}) {
  return (
    <section className="section-pad border-t border-border">
      <div className="luxury-container max-w-3xl text-center">
        <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
        <p className="mt-4 text-muted-foreground">
          Nouveautés, éditions limitées et invitations privées.
        </p>
        <NewsletterForm locale={locale} className="mx-auto mt-8 max-w-xl" />
      </div>
    </section>
  );
}
