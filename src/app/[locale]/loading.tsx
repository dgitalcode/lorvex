import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="relative flex min-h-[100svh] items-center bg-secondary/60">
        <div className="luxury-container flex w-full justify-center pb-24 pt-[calc(var(--header-height)+0.5rem)] md:pb-28">
          <div className="flex w-full max-w-[40rem] flex-col items-center md:max-w-[46rem]">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="mt-5 h-12 w-full max-w-lg md:h-16" />
            <Skeleton className="mt-2 h-12 w-2/3 max-w-md md:h-16" />
            <Skeleton className="mt-6 h-4 w-full max-w-md" />
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <Skeleton className="h-14 w-52" />
              <Skeleton className="h-14 w-52" />
            </div>
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
