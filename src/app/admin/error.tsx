"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center border border-border bg-card p-10 text-center">
      <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
        Administration
      </p>
      <h1 className="mt-3 font-display text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred in the admin panel."}
      </p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
