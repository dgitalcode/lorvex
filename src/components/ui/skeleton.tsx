import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("skeleton-shimmer bg-muted/80", className)}
      {...props}
    />
  );
}

function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-4 h-2.5 w-16" />
      <Skeleton className="mt-2.5 h-5 w-3/4" />
      <Skeleton className="mt-2.5 h-3.5 w-24" />
    </div>
  );
}

function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, ProductCardSkeleton, ProductGridSkeleton };
