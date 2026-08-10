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

const DEFAULT_VIDEO =
  "https://videos.pexels.com/video-files/6827405/6827405-uhd_2560_1440_25fps.mp4";
const DEFAULT_IMAGE = "/images/lorvex/hero.jpg";

export function CinematicHero({
  locale,
  dictionary,
  content,
}: {
  locale: Locale;
  dictionary: Dictionary;
  content?: {
    title?: string;
    subtitle?: string;
    videoUrl?: string;
    imageUrl?: string;
    ctaPrimaryHref?: string;
    ctaSecondaryHref?: string;
  };
}) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(true);

  const imageUrl = content?.imageUrl || DEFAULT_IMAGE;
  const videoUrl = content?.videoUrl ?? DEFAULT_VIDEO;
  const title = content?.title ?? dictionary.hero.title;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) {
      setVideoOk(false);
      return;
    }
    const fail = () => setVideoOk(false);
    video.addEventListener("error", fail);
    video.play().catch(fail);
    return () => video.removeEventListener("error", fail);
  }, [reduce, videoUrl]);

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
          {videoOk && !reduce ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster={imageUrl}
            >
              <source src={videoUrl} type="video/mp4" />
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
          {content?.subtitle ?? dictionary.hero.subtitle}
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
          Scroll
        </span>
        <span className="h-10 w-px origin-top animate-pulse bg-foreground/40" />
      </div>
    </section>
  );
}
