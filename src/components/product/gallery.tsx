"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Play,
  Rotate3d,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Viewer360 } from "@/components/product/viewer-360";
import { cn } from "@/lib/utils";
import type { PdpMedia, PdpSpec } from "@/components/product/types";

type GalleryMode = "image" | "video" | "spin";

const HOTSPOT_POSITIONS = [
  { top: "22%", left: "50%" },
  { top: "48%", left: "76%" },
  { top: "68%", left: "34%" },
  { top: "38%", left: "22%" },
] as const;

export function ProductGallery({
  name,
  images,
  videos,
  spinFrames,
  activeUrl,
  onActiveUrlChange,
  hotspotSpecs,
}: {
  name: string;
  images: PdpMedia[];
  videos: PdpMedia[];
  spinFrames: string[];
  activeUrl: string;
  onActiveUrlChange: (url: string) => void;
  hotspotSpecs: PdpSpec[];
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<GalleryMode>("image");
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hotspotsOn, setHotspotsOn] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [origin, setOrigin] = useState("50% 50%");
  const frameRef = useRef<HTMLDivElement>(null);

  const activeIndex = Math.max(
    0,
    images.findIndex((img) => img.url === activeUrl),
  );
  const active = images[activeIndex] ?? images[0];
  const hasSpin = spinFrames.length >= 2;
  const hasVideo = videos.length > 0;

  function go(direction: 1 | -1) {
    const next = (activeIndex + direction + images.length) % images.length;
    onActiveUrlChange(images[next].url);
  }

  function trackZoomOrigin(clientX: number, clientY: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  const hotspots = hotspotSpecs.slice(0, HOTSPOT_POSITIONS.length);

  return (
    <div>
      <div className="relative">
        {mode === "spin" && hasSpin ? (
          <Viewer360 frames={spinFrames} alt={name} />
        ) : mode === "video" && hasVideo ? (
          <div className="relative aspect-square w-full overflow-hidden bg-[#0c0b0a]">
            <video
              key={videos[0].url}
              className="h-full w-full object-cover"
              controls
              playsInline
              preload="metadata"
              poster={active?.url}
            >
              <source src={videos[0].url} type="video/mp4" />
            </video>
          </div>
        ) : (
          <div
            ref={frameRef}
            className={cn(
              "group relative block aspect-square w-full overflow-hidden border border-border/40 bg-secondary",
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
            onClick={(e) => {
              trackZoomOrigin(e.clientX, e.clientY);
              setZoomed((z) => !z);
            }}
            onMouseMove={(e) => zoomed && trackZoomOrigin(e.clientX, e.clientY)}
            onMouseLeave={() => setZoomed(false)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active?.url}
                className="absolute inset-0"
                initial={reduce ? false : { opacity: 0, scale: 1.015 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={active?.url ?? ""}
                  alt={active?.alt ?? name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                  style={{
                    transform: zoomed ? "scale(2.4)" : undefined,
                    transformOrigin: origin,
                  }}
                />
              </motion.div>
            </AnimatePresence>

            {hotspotsOn &&
              !zoomed &&
              hotspots.map((spec, i) => (
                <span
                  key={`${spec.group}-${spec.label}`}
                  className="absolute z-10"
                  style={HOTSPOT_POSITIONS[i]}
                >
                  <button
                    type="button"
                    aria-label={`${spec.label}: ${spec.value}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHotspot(activeHotspot === i ? null : i);
                    }}
                    className="relative flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  >
                    <span className="absolute h-6 w-6 animate-ping rounded-full bg-accent/25 motion-reduce:animate-none" />
                    <span className="relative h-2.5 w-2.5 rounded-full border border-background bg-accent shadow-[var(--shadow-soft)]" />
                  </button>
                  <AnimatePresence>
                    {activeHotspot === i && (
                      <motion.span
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute left-1/2 top-4 z-20 block w-44 -translate-x-1/2 border border-border bg-background/95 p-3 text-left backdrop-blur-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="block text-[9px] uppercase tracking-[0.2em] text-accent">
                          {spec.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-foreground">
                          {spec.value}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              ))}

            {images.length > 1 && !zoomed && (
              <>
                <button
                  type="button"
                  aria-label="Image précédente"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-background/80 opacity-0 backdrop-blur-md transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Image suivante"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-background/80 opacity-0 backdrop-blur-md transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              aria-label="Plein écran"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(true);
              }}
              className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center bg-background/85 backdrop-blur-md transition-colors hover:bg-background"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {hotspots.length > 0 && (
              <button
                type="button"
                aria-pressed={hotspotsOn}
                onClick={(e) => {
                  e.stopPropagation();
                  setHotspotsOn((on) => !on);
                  setActiveHotspot(null);
                }}
                className={cn(
                  "absolute bottom-4 left-4 flex h-11 items-center gap-2 px-4 text-[10px] uppercase tracking-[0.18em] backdrop-blur-md transition-colors",
                  hotspotsOn
                    ? "bg-foreground text-background"
                    : "bg-background/85 hover:bg-background",
                )}
              >
                Détails
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        <div className="grid flex-1 grid-cols-5 gap-3">
          {images.slice(0, 5).map((image) => (
            <button
              key={image.id}
              type="button"
              aria-label={image.alt}
              onClick={() => {
                setMode("image");
                onActiveUrlChange(image.url);
              }}
              className={cn(
                "relative aspect-square overflow-hidden border bg-secondary transition-all duration-300",
                mode === "image" && activeUrl === image.url
                  ? "border-accent"
                  : "border-transparent opacity-75 hover:opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        {(hasSpin || hasVideo) && (
          <div className="flex flex-col gap-2">
            {hasSpin && (
              <button
                type="button"
                aria-pressed={mode === "spin"}
                onClick={() => setMode(mode === "spin" ? "image" : "spin")}
                className={cn(
                  "flex h-full min-h-11 w-11 items-center justify-center border transition-colors",
                  mode === "spin"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-foreground",
                )}
              >
                <Rotate3d className="h-4 w-4" />
                <span className="sr-only">Vue 360°</span>
              </button>
            )}
            {hasVideo && (
              <button
                type="button"
                aria-pressed={mode === "video"}
                onClick={() => setMode(mode === "video" ? "image" : "video")}
                className={cn(
                  "flex h-full min-h-11 w-11 items-center justify-center border transition-colors",
                  mode === "video"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-foreground",
                )}
              >
                <Play className="h-4 w-4" />
                <span className="sr-only">Vidéo</span>
              </button>
            )}
          </div>
        )}
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="h-[96vh] max-w-[96vw] gap-0 border-0 bg-[#0c0b0a] p-0 text-[#f2eee6] sm:max-w-[96vw]">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <div className="relative h-full w-full overflow-hidden">
            <div
              className="relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: origin,
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setOrigin(
                  `${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`,
                );
              }}
            >
              <Image
                src={active?.url ?? ""}
                alt={active?.alt ?? name}
                fill
                sizes="96vw"
                quality={95}
                className="object-contain"
              />
            </div>
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                aria-label="Zoom arrière"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-white/10"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-14 text-center text-xs tabular-nums">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom avant"
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
                className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-white/10"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
            {images.length > 1 && (
              <div className="absolute left-1/2 top-6 flex -translate-x-1/2 gap-2">
                {images.map((image, i) => (
                  <button
                    key={image.id}
                    type="button"
                    aria-label={`Image ${i + 1}`}
                    onClick={() => {
                      onActiveUrlChange(image.url);
                      setZoomLevel(1);
                    }}
                    className={cn(
                      "h-1 w-8 transition-colors",
                      i === activeIndex ? "bg-[#c9ae7a]" : "bg-white/25",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
