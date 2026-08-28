import { cn } from "@/lib/utils";

export function InfiniteMarquee({
  items,
  className,
  speed = 28,
}: {
  items: string[];
  className?: string;
  speed?: number;
}) {
  const sequence = [...items, ...items];

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-border/60 bg-secondary/30 py-4 md:py-5",
        className,
      )}
      aria-hidden
    >
      <div
        className="flex w-max animate-marquee gap-10 whitespace-nowrap will-change-transform md:gap-14"
        style={{ animationDuration: `${speed}s` }}
      >
        {sequence.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="font-display text-2xl tracking-[0.06em] text-foreground/75 md:text-4xl"
          >
            {item}
            <span className="mx-6 text-accent/80 md:mx-8">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
