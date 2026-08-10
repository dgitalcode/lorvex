import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="page-pad"
    >
      <div className="luxury-container pb-20">
        <div className="mb-10 border-b border-border pb-8">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-12 w-56 md:h-14" />
          <Skeleton className="mt-4 h-3.5 w-24" />
        </div>
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <div className="hidden space-y-8 lg:block">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-2.5 w-20" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-8 flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
            <ProductGridSkeleton className="md:grid-cols-3 lg:grid-cols-3" count={9} />
          </div>
        </div>
      </div>
    </div>
  );
}
