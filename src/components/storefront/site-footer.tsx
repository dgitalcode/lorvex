import Link from "next/link";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { InfiniteMarquee } from "@/components/luxury/marquee";

export function SiteFooter({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const year = new Date().getFullYear();

  const columns = [
    {
      title: dictionary.nav.shop,
      links: [
        { href: `/${locale}/shop`, label: dictionary.nav.shop },
        { href: `/${locale}/collections`, label: dictionary.nav.collections },
        { href: `/${locale}/shop?new=1`, label: dictionary.nav.newArrivals },
        { href: `/${locale}/shop?limited=1`, label: dictionary.nav.limited },
      ],
    },
    {
      title: dictionary.footer.concierge,
      links: [
        { href: `/${locale}/about`, label: dictionary.nav.about },
        { href: `/${locale}/contact`, label: dictionary.nav.contact },
        { href: `/${locale}/faq`, label: "FAQ" },
        { href: `/${locale}/account`, label: dictionary.nav.account },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: `/${locale}/legal/privacy`, label: dictionary.footer.privacy },
        { href: `/${locale}/legal/terms`, label: dictionary.footer.terms },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <InfiniteMarquee
        items={[
          "Casablanca",
          "Rabat",
          "Marrakech",
          "Authenticité",
          "Conciergerie",
          "Éditions Limitées",
          siteConfig.name,
        ]}
        speed={36}
      />

      <div className="luxury-container section-pad grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-display text-5xl tracking-[0.22em] md:text-6xl">
            {siteConfig.name}
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description[locale]}
          </p>
          <div className="mt-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {dictionary.footer.newsletter}
            </p>
            <NewsletterForm locale={locale} className="mt-4" />
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="luxury-container flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}. {dictionary.footer.rights}
          </p>
          <div className="flex gap-4">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Instagram
            </a>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Facebook
            </a>
            <a
              href={siteConfig.social.tiktok}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              TikTok
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
