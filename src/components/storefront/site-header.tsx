"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ShoppingBag,
  Heart,
  User,
  X,
  Shield,
  Package,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";
import type { StorefrontSettings } from "@/lib/storefront-settings";
import { useCartStore } from "@/stores/cart-store";
import { useLuxuryUiStore } from "@/stores/luxury-ui-store";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { useSession } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const megaItems = (locale: Locale) => [
  {
    title: "Heritage",
    href: `/${locale}/collections/heritage`,
    image: "/images/lorvex/mega-01.jpg",
  },
  {
    title: "Sport Élégance",
    href: `/${locale}/collections/sport-elegance`,
    image: "/images/lorvex/mega-02.jpg",
  },
  {
    title: "Haute Complication",
    href: `/${locale}/collections/haute-complication`,
    image: "/images/lorvex/mega-03.jpg",
  },
  {
    title: "Éditions Limitées",
    href: `/${locale}/shop?limited=1`,
    image: "/images/lorvex/mega-04.jpg",
  },
];

/** Publishes the real chrome height after idle so first paint is not blocked by forced reflow. */
function useHeaderChromeHeight(
  chromeRef: React.RefObject<HTMLElement | null>,
  deps: unknown[],
) {
  useEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    let frame = 0;
    let observer: ResizeObserver | null = null;

    const publish = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height <= 0) return;
      const next = `${height}px`;
      if (
        document.documentElement.style.getPropertyValue("--header-height") ===
        next
      ) {
        return;
      }
      document.documentElement.style.setProperty("--header-height", next);
    };

    const start = () => {
      publish();
      frame = requestAnimationFrame(publish);
      observer = new ResizeObserver(publish);
      observer.observe(el);
      window.addEventListener("resize", publish, { passive: true });
      window.addEventListener("orientationchange", publish);
      window.visualViewport?.addEventListener("resize", publish);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId =
      typeof idleWindow.requestIdleCallback === "function"
        ? idleWindow.requestIdleCallback(start, { timeout: 2500 })
        : window.setTimeout(start, 1);

    return () => {
      if (typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      window.removeEventListener("orientationchange", publish);
      window.visualViewport?.removeEventListener("resize", publish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency list from caller
  }, deps);
}

export function SiteHeader({
  locale,
  dictionary,
  announcement,
  settings,
}: {
  locale: Locale;
  dictionary: Dictionary;
  announcement?: string;
  settings: StorefrontSettings;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const chromeRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaPath, setMegaPath] = useState(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePath, setMobilePath] = useState(pathname);
  const setSearchOpen = useLuxuryUiStore((s) => s.setSearchOpen);
  const persistedCartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );
  const cartCount = mounted ? persistedCartCount : 0;

  if (pathname !== megaPath) {
    setMegaPath(pathname);
    if (megaOpen) setMegaOpen(false);
  }

  // Close mobile menu on route change (incl. Back/Forward).
  if (pathname !== mobilePath) {
    setMobilePath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  useHeaderChromeHeight(chromeRef, [announcement, pathname, settings.siteName]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const links = [
    { href: `/${locale}/shop`, label: dictionary.nav.shop },
    { href: `/${locale}/collections`, label: dictionary.nav.collections },
    { href: `/${locale}/shop?new=1`, label: dictionary.nav.newArrivals },
    { href: `/${locale}/shop?limited=1`, label: dictionary.nav.limited },
    { href: `/${locale}/about`, label: dictionary.nav.about },
  ];

  const accountLinks = isAuthenticated
    ? [
        {
          href: `/${locale}/account`,
          label: dictionary.nav.account,
          icon: User,
        },
        {
          href: `/${locale}/account/orders`,
          label: dictionary.account.orders,
          icon: Package,
        },
        {
          href: `/${locale}/account/security`,
          label: dictionary.account.settings,
          icon: Shield,
        },
        {
          href: `/${locale}/account/wishlist`,
          label: dictionary.nav.wishlist,
          icon: Heart,
        },
      ]
    : [
        {
          href: `/${locale}/auth/sign-in`,
          label:
            locale === "ar"
              ? "تسجيل الدخول"
              : locale === "en"
                ? "Sign in"
                : "Connexion",
          icon: LogIn,
        },
        {
          href: `/${locale}/auth/sign-in`,
          label:
            locale === "ar"
              ? "إنشاء حساب"
              : locale === "en"
                ? "Sign up"
                : "Créer un compte",
          icon: User,
        },
      ];

  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const solidNav = !isHome || scrolled || megaOpen;

  return (
    <header
      onMouseLeave={() => setMegaOpen(false)}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div ref={chromeRef} className="pt-[env(safe-area-inset-top,0px)]">
        <AnnouncementBar message={announcement} />
        {settings.maintenanceMode ? (
          <div className="bg-accent text-accent-foreground">
            <p className="px-4 py-1.5 text-center text-[10px] uppercase tracking-[0.16em]">
              {locale === "ar"
                ? "وضع الصيانة مفعّل"
                : locale === "en"
                  ? "Maintenance mode is enabled"
                  : "Mode maintenance activé"}
            </p>
          </div>
        ) : null}
        <div
          className={cn(
            "transition-[background,backdrop-filter,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            solidNav
              ? "border-b border-border/50 bg-background/90 shadow-[var(--shadow-soft)] backdrop-blur-xl"
              : "border-b border-transparent bg-transparent",
          )}
        >
          <div className="luxury-container flex h-[var(--nav-bar-height)] items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menu"
                    className="flex h-10 w-10 items-center justify-center"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side={locale === "ar" ? "right" : "left"}
                  className="flex w-full max-w-sm flex-col bg-background/95 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
                >
                  <SheetHeader>
                    <SheetTitle className="font-display text-3xl tracking-[0.22em]">
                      {settings.siteName}
                    </SheetTitle>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {locale === "ar"
                        ? "القائمة"
                        : locale === "en"
                          ? "Menu"
                          : "Menu"}
                    </p>
                  </SheetHeader>
                  <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
                    {links.map((link) => {
                      const active = pathname.startsWith(
                        link.href.split("?")[0],
                      );
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          onClick={closeMobile}
                          className={cn(
                            "border-b border-border/60 py-4 font-display text-3xl transition-colors",
                            active ? "text-accent" : "hover:text-accent",
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}

                    <div className="mt-8 border-t border-border/60 pt-6">
                      <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {dictionary.nav.account}
                      </p>
                      <ul className="space-y-1">
                        {accountLinks.map((item) => (
                          <li key={`${item.href}-${item.label}`}>
                            <Link
                              href={item.href}
                              onClick={closeMobile}
                              className="flex items-center gap-3 py-3 text-sm uppercase tracking-[0.14em] transition-colors hover:text-accent"
                            >
                              <item.icon className="h-4 w-4 text-accent" />
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </nav>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-6">
                    <LocaleSwitcher
                      locale={locale}
                      onNavigate={closeMobile}
                    />
                    <ThemeToggle />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <Link
              href={`/${locale}`}
              onClick={closeMobile}
              className="font-display text-2xl tracking-[0.28em] md:text-[1.65rem]"
            >
              {settings.siteName}
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              <button
                type="button"
                className="text-[11px] uppercase tracking-[0.2em] transition-colors hover:text-accent"
                onMouseEnter={() => setMegaOpen(true)}
                onFocus={() => setMegaOpen(true)}
                aria-expanded={megaOpen}
                aria-haspopup="true"
              >
                {dictionary.nav.collections}
              </button>
              {links
                .filter((l) => !l.href.includes("collections"))
                .slice(0, 3)
                .map((link) => {
                  const active = pathname.startsWith(link.href.split("?")[0]);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "text-[11px] uppercase tracking-[0.2em] transition-colors hover:text-accent",
                        active && "text-accent",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden items-center gap-1 lg:flex">
                <LocaleSwitcher locale={locale} />
                <ThemeToggle />
              </div>
              <button
                type="button"
                aria-label={dictionary.nav.search}
                className="flex h-10 w-10 items-center justify-center"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </button>
              <Link
                href={`/${locale}/account/wishlist`}
                aria-label={dictionary.nav.wishlist}
                className="hidden h-10 w-10 items-center justify-center sm:flex"
              >
                <Heart className="h-4 w-4" />
              </Link>
              <Link
                href={
                  isAuthenticated
                    ? `/${locale}/account`
                    : `/${locale}/auth/sign-in`
                }
                aria-label={dictionary.nav.account}
                className="hidden h-10 w-10 items-center justify-center sm:flex"
              >
                <User className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/cart`}
                aria-label={dictionary.nav.cart}
                className="relative flex h-10 w-10 items-center justify-center"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] text-accent-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {megaOpen ? (
          <div
            className={cn(
              "overflow-hidden border-t border-border/40 bg-background/80 backdrop-blur-xl",
              solidNav && "shadow-[var(--shadow-soft)]",
            )}
            onMouseEnter={() => setMegaOpen(true)}
          >
            <div className="luxury-container relative grid gap-6 py-10 md:grid-cols-4">
              {megaItems(locale).map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className="group block"
                    onClick={() => setMegaOpen(false)}
                  >
                    <div
                      className="relative mb-4 aspect-[4/3] overflow-hidden bg-secondary bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                      style={{ backgroundImage: `url(${item.image})` }}
                    />
                    <p className="font-display text-2xl transition-colors group-hover:text-accent">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Découvrir la collection
                    </p>
                  </Link>
                </div>
              ))}
              <button
                type="button"
                className="absolute right-6 top-6 hidden md:flex"
                onClick={() => setMegaOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
    </header>
  );
}

export function AnnouncementBar({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-primary text-primary-foreground">
      <p className="px-4 py-2 text-center text-[11px] uppercase leading-snug tracking-[0.18em]">
        {message}
      </p>
    </div>
  );
}
