"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";

export function Viewer360({
  frames,
  alt,
  className,
}: {
  frames: string[];
  alt: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startIndex: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const step = useCallback(
    (clientX: number) => {
      const width = containerRef.current?.clientWidth ?? 400;
      const deltaX = clientX - dragState.current.startX;
      const framesMoved = Math.round((deltaX / width) * frames.length * 1.5);
      const next =
        ((dragState.current.startIndex - framesMoved) % frames.length +
          frames.length) %
        frames.length;
      setIndex(next);
    },
    [frames.length],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => step(e.clientX);
    const onUp = () => setDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, step]);

  if (frames.length < 2) return null;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`${alt} — vue 360°`}
      className={cn(
        "relative aspect-square w-full touch-pan-y overflow-hidden bg-secondary select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      onPointerDown={(e) => {
        dragState.current = { startX: e.clientX, startIndex: index };
        setDragging(true);
      }}
    >
      {frames.map((frame, i) => (
        <Image
          key={frame + i}
          src={frame}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 58vw"
          className={cn(
            "object-cover transition-opacity duration-75",
            i === index ? "opacity-100" : "opacity-0",
          )}
          priority={i === 0}
          draggable={false}
        />
      ))}
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 bg-background/85 px-4 py-2 text-[10px] uppercase tracking-[0.2em] backdrop-blur-md">
        <Rotate3d className="h-3.5 w-3.5 text-accent" />
        {dragging ? `${Math.round((index / frames.length) * 360)}°` : "Glisser pour pivoter"}
      </div>
    </div>
  );
}
