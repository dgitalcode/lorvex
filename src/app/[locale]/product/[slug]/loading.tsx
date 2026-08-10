import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="luxury-container pb-24 page-pad"
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
        <div className="lg:pt-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-4/5" />
          <Skeleton className="mt-5 h-6 w-36" />
          <Skeleton className="mt-8 h-4 w-full" />
          <Skeleton className="mt-2.5 h-4 w-5/6" />
          <div className="mt-10 space-y-3">
            <Skeleton className="h-2.5 w-16" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
          <Skeleton className="mt-10 h-14 w-full" />
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-11 w-11" />
            <Skeleton className="h-11 w-11" />
            <Skeleton className="h-11 w-11" />
          </div>
        </div>
      </div>
    </div>
  );
}
