"use client";

import Link from "next/link";
import { StorefrontImage } from "@/components/shared/storefront-image";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/config/site";
import { storefrontCopy } from "@/content/storefront-copy";

const DEFAULT_IMAGE = "/images/lorvex/hero.jpg";

export type HeroMediaType = "image" | "video" | "none";

export type CinematicHeroContent = {
  title?: string;
  subtitle?: string;
  mediaType?: HeroMediaType;
  videoUrl?: string;
  imageUrl?: string;
  posterUrl?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryHref?: string;
};

function resolveMediaType(content?: CinematicHeroContent): HeroMediaType {
  if (content?.mediaType === "image" || content?.mediaType === "video" || content?.mediaType === "none") {
    return content.mediaType;
  }
  if (content?.videoUrl?.trim()) return "video";
  if (content?.imageUrl?.trim()) return "image";
  return "none";
}

function videoMimeFromUrl(url: string): string | undefined {
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".mp4")) return "video/mp4";
  return undefined;
}

export function CinematicHero({
  locale,
  dictionary,
  content,
}: {
  locale: Locale;
  dictionary: Dictionary;
  content?: CinematicHeroContent;
}) {
  const [reduce, setReduce] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const mediaType = resolveMediaType(content);
  const posterUrl =
    content?.posterUrl?.trim() ||
    content?.imageUrl?.trim() ||
    DEFAULT_IMAGE;
  const imageUrl =
    mediaType === "none"
      ? DEFAULT_IMAGE
      : content?.imageUrl?.trim() || posterUrl || DEFAULT_IMAGE;
  const videoUrl =
    mediaType === "video" ? content?.videoUrl?.trim() || "" : "";
  const videoOk = Boolean(videoUrl) && !reduce && failedVideoUrl !== videoUrl;
  const showVideo = videoOk;
  const title = dictionary.hero.title;
  const subtitle = dictionary.hero.subtitle;
  const mime = videoUrl ? videoMimeFromUrl(videoUrl) : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo || !videoUrl) return;

    const fail = () => setFailedVideoUrl(videoUrl);
    const tryPlay = () => {
      video.muted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(fail);
      }
    };

    video.addEventListener("error", fail);
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("loadeddata", tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener("error", fail);
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [showVideo, videoUrl]);

  useGSAP(
    () => {
      if (reduce || !rootRef.current) return;
      let idleId = 0;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const setup = () => {
        registerGsap();
        if (mediaRef.current) {
          gsap.to(mediaRef.current, {
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (copyRef.current) {
          gsap.to(copyRef.current, {
            y: 48,
            opacity: 0.55,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(setup, { timeout: 2500 });
      } else {
        timeoutId = globalThis.setTimeout(setup, 1);
      }

      return () => {
        if (idleId && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
        if (timeoutId) globalThis.clearTimeout(timeoutId);
      };
    },
    { dependencies: [reduce] },
  );

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-[#12110f]"
    >
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        <div className="relative h-full w-full scale-105">
          <StorefrontImage
            src={imageUrl}
            alt=""
            fill
            priority
            fetchPriority="high"
            quality={85}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1920px"
            aria-hidden
          />
          {showVideo ? (
            <video
              key={videoUrl}
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={posterUrl}
              aria-hidden
            >
              {mime ? (
                <source src={videoUrl} type={mime} />
              ) : (
                <source src={videoUrl} />
              )}
            </video>
          ) : null}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(12_11_10/0.28)_100%)]" />
      </div>

      <div
        ref={copyRef}
        className="luxury-container relative z-10 pb-20 pt-40 will-change-transform md:pb-28"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/80">
          {dictionary.hero.eyebrow}
        </p>
        <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[0.95] tracking-tight text-balance md:text-7xl lg:text-8xl">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button asChild size="xl">
            <Link href={content?.ctaPrimaryHref ?? `/${locale}/shop`}>
              {dictionary.hero.ctaPrimary}
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link href={content?.ctaSecondaryHref ?? `/${locale}/contact`}>
              {dictionary.hero.ctaSecondary}
            </Link>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <span className="text-[10px] uppercase tracking-[0.28em] text-foreground/55">
          {storefrontCopy(locale).scroll}
        </span>
        <span className="h-10 w-px origin-top animate-pulse bg-foreground/40" />
      </div>
    </section>
  );
}
