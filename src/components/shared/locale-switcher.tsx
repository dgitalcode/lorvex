"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, type Locale } from "@/config/site";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.16em]">
      {siteConfig.locales.map((loc) => {
        const href = pathname.replace(`/${locale}`, `/${loc}`);
        return (
          <Link
            key={loc}
            href={href}
            className={
              loc === locale
                ? "px-1.5 text-accent"
                : "px-1.5 text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {loc}
          </Link>
        );
      })}
    </div>
  );
}
