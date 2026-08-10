import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "accent" | "outline" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "accent" && "bg-accent text-accent-foreground",
        variant === "outline" && "border border-border text-foreground",
        variant === "muted" && "bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
