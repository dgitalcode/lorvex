import Link from "next/link";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import type { CinematicHeroContent } from "@/components/luxury/cinematic-hero";
import { HeroVideo } from "@/components/storefront/hero-video";
import { StorefrontImage } from "@/components/shared/storefront-image";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";
import { storefrontCopy } from "@/content/storefront-copy";

const DEFAULT_HERO = "/images/lorvex/hero.jpg";

function resolveHeroMedia(content?: CinematicHeroContent) {
  const mediaType =
    content?.mediaType === "image" ||
    content?.mediaType === "video" ||
    content?.mediaType === "none"
      ? content.mediaType
      : content?.videoUrl?.trim()
        ? "video"
        : content?.imageUrl?.trim()
          ? "image"
          : "none";
  const imageUrl =
    mediaType === "none"
      ? DEFAULT_HERO
      : content?.imageUrl?.trim() || DEFAULT_HERO;
  const videoUrl =
    mediaType === "video" ? content?.videoUrl?.trim() || "" : "";
  return { imageUrl, videoUrl };
}

export function HeroSection({
  locale,
  dictionary,
  content,
}: {
  locale: Locale;
  dictionary: Dictionary;
  content?: CinematicHeroContent;
}) {
  const { imageUrl, videoUrl } = resolveHeroMedia(content);
  const copy = storefrontCopy(locale);
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-[color:var(--hero-veil)]">
      <div className="absolute inset-0" aria-hidden>
        <div className="relative h-full w-full bg-[color:var(--hero-veil)]">
          {videoUrl ? (
            <HeroVideo videoUrl={videoUrl} />
          ) : (
            <StorefrontImage
              src={imageUrl}
              alt=""
              fill
              priority
              fetchPriority="high"
              quality={85}
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1920px"
              aria-hidden
            />
          )}
        </div>
        <div className="absolute inset-0 bg-[color:var(--hero-veil)]/20" />
        <div className="absolute inset-x-0 top-0 h-[min(32vh,15rem)] bg-gradient-to-b from-[color:var(--hero-veil)]/65 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(28_25_22/0.12)_0%,rgb(28_25_22/0.28)_55%,rgb(28_25_22/0.42)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[min(36vh,18rem)] bg-gradient-to-t from-[color:var(--hero-veil)] via-[color:var(--hero-veil)]/55 to-transparent" />
      </div>
      <div className="luxury-container relative z-10 flex w-full justify-center pt-[calc(var(--header-height)+0.5rem)] pb-24 md:pb-28">
        <div className="flex w-full max-w-[40rem] flex-col items-center text-center md:max-w-[46rem]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--hero-ink-muted)] md:tracking-[0.32em]">
            {dictionary.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-[20ch] font-display text-[2.35rem] leading-[1.14] tracking-tight text-[color:var(--hero-ink)] sm:mt-5 sm:text-[2.85rem] sm:leading-[1.12] md:text-5xl md:leading-[1.1] lg:text-[3.75rem] lg:leading-[1.08]">
            {dictionary.hero.title}
          </h1>
          <p className="mt-5 max-w-[28rem] text-[0.9375rem] leading-[1.7] text-[color:var(--hero-ink-muted)] sm:mt-6 md:max-w-[32rem] md:text-base">
            {dictionary.hero.subtitle}
          </p>
          <div className="mt-8 flex w-full flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
            <Button asChild size="xl" variant="accent">
              <Link href={content?.ctaPrimaryHref ?? `/${locale}/shop`}>
                {dictionary.hero.ctaPrimary}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="xl"
              className="border-[color:var(--hero-ink)]/40 bg-transparent text-[color:var(--hero-ink)] hover:border-[color:var(--hero-ink)] hover:bg-[color:var(--hero-ink)] hover:text-[color:var(--hero-veil)]"
            >
              <Link href={content?.ctaSecondaryHref ?? `/${locale}/contact`}>
                {dictionary.hero.ctaSecondary}
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 hidden flex-col items-center gap-2 md:flex md:bottom-8">
        <span className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--hero-ink-muted)]">
          {copy.scroll}
        </span>
        <span className="h-8 w-px bg-[color:var(--hero-ink)]/35" />
      </div>
    </section>
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
                  <StorefrontImage
                    src={collection.coverUrl}
                    alt={collection.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
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

export function WhyChooseUs({
  title,
  items,
}: {
  title: string;
  items: { title: string; body: string }[];
}) {

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
  stats,
}: {
  title: string;
  stats: { value: string; label: string }[];
}) {
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
  const copy = storefrontCopy(locale);
  return (
    <section className="section-pad">
      <div className="luxury-container grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <StorefrontImage
            src="/images/lorvex/atelier.jpg"
            alt={copy.brandStoryAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <FadeIn delay={0.12}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {siteConfig.name}
          </p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            {title}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {copy.homeDescription}
          </p>
          <div className="mt-8">
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/about`}>{copy.brandStoryCta}</Link>
            </Button>
          </div>
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
              <StorefrontImage
                src={src}
                alt={`LORVEX lifestyle ${index + 1}`}
                fill
                sizes="25vw"
                className="object-cover"
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
