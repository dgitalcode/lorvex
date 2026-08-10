import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="relative flex min-h-[100svh] items-end bg-secondary/60">
        <div className="luxury-container w-full pb-20 pt-40 md:pb-28">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="mt-6 h-14 w-full max-w-2xl md:h-20" />
          <Skeleton className="mt-3 h-14 w-2/3 max-w-xl md:h-20" />
          <Skeleton className="mt-6 h-4 w-full max-w-md" />
          <div className="mt-10 flex gap-4">
            <Skeleton className="h-14 w-52" />
            <Skeleton className="h-14 w-52" />
          </div>
        </div>
      </div>
      <div className="luxury-container section-pad">
        <Skeleton className="h-10 w-64" />
        <ProductGridSkeleton className="mt-12" />
      </div>
    </div>
  );
}
