"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { siteConfig, type Locale } from "@/config/site";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_META: Record<
  Locale,
  { code: string; label: string; native: string }
> = {
  fr: { code: "FR", label: "Français", native: "Français" },
  en: { code: "EN", label: "English", native: "English" },
  ar: { code: "AR", label: "Arabic", native: "العربية" },
};

export function LocaleSwitcher({
  locale,
  onNavigate,
  className,
}: {
  locale: Locale;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const current = LOCALE_META[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${current.label} / ${current.native}`}
        className={cn(
          "group inline-flex h-9 items-center gap-1.5 border border-transparent px-2",
          "text-[11px] uppercase tracking-[0.18em] text-foreground/80",
          "transition-[color,border-color,background-color] duration-300",
          "hover:border-border/70 hover:bg-muted/40 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          "data-[state=open]:border-border/70 data-[state=open]:bg-muted/40",
          className,
        )}
      >
        <span className="font-medium text-accent">{current.code}</span>
        <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[9.5rem] border-border/80 bg-background/95 p-1.5 backdrop-blur-xl"
      >
        {siteConfig.locales.map((loc) => {
          const meta = LOCALE_META[loc];
          const href = pathname.replace(`/${locale}`, `/${loc}`);
          const active = loc === locale;
          return (
            <DropdownMenuItem
              key={loc}
              asChild
              className={cn(
                "cursor-pointer gap-3 rounded-none px-2.5 py-2 text-[11px] uppercase tracking-[0.14em]",
                active && "bg-muted/60 text-accent",
              )}
            >
              <Link
                href={href}
                hrefLang={loc}
                lang={loc}
                aria-current={active ? "true" : undefined}
                onClick={() => onNavigate?.()}
              >
                <span className="w-6 font-medium">{meta.code}</span>
                <span className="normal-case tracking-normal text-muted-foreground">
                  {meta.native}
                </span>
                {active ? (
                  <Check className="ms-auto h-3.5 w-3.5 text-accent" />
                ) : (
                  <span className="ms-auto w-3.5" />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
