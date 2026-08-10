import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border/70 bg-card px-8 py-16 text-center shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center border border-border/80 bg-secondary/50 text-accent">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </span>
      {eyebrow && (
        <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 max-w-md font-display text-3xl leading-tight text-balance md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
