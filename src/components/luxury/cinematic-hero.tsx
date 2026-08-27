"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import { gsap, registerGsap } from "@/components/luxury/gsap-provider";
import { SplitHeadline } from "@/components/luxury/text-reveal";
import { Magnetic } from "@/components/luxury/magnetic";
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
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);

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
  const title =
    locale === "fr" && content?.title?.trim()
      ? content.title.trim()
      : dictionary.hero.title;
  const subtitle =
    locale === "fr" && content?.subtitle?.trim()
      ? content.subtitle.trim()
      : dictionary.hero.subtitle;
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
      registerGsap();
      if (reduce || !rootRef.current) return;

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
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
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
        <SplitHeadline
          text={title}
          className="mt-6 max-w-4xl font-display text-5xl leading-[0.95] tracking-tight text-balance md:text-7xl lg:text-8xl"
        />
        <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Magnetic>
            <Button asChild size="xl">
              <Link href={content?.ctaPrimaryHref ?? `/${locale}/shop`}>
                {dictionary.hero.ctaPrimary}
              </Link>
            </Button>
          </Magnetic>
          <Magnetic strength={0.28}>
            <Button asChild variant="outline" size="xl">
              <Link href={content?.ctaSecondaryHref ?? `/${locale}/contact`}>
                {dictionary.hero.ctaSecondary}
              </Link>
            </Button>
          </Magnetic>
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
