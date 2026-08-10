import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("border-border/80 bg-card/80 shadow-none", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center border border-border text-accent">
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-3xl tabular-nums">{value}</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {hint && <span>{hint}</span>}
          {trend && (
            <span
              className={cn(
                "tabular-nums",
                trend.positive === false ? "text-destructive" : "text-success",
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
