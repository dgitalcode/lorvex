"use client";

import { useEffect, useRef } from "react";

function videoMimeFromUrl(url: string): string | undefined {
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".mp4")) return "video/mp4";
  return undefined;
}

export function HeroVideo({
  videoUrl,
  posterUrl,
}: {
  videoUrl: string;
  posterUrl: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mime = videoMimeFromUrl(videoUrl);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const video = videoRef.current;
    if (!video) return;
    const fail = () => {
      video.style.display = "none";
    };
    const tryPlay = () => {
      video.muted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(fail);
      }
    };
    video.addEventListener("error", fail);
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });
    return () => {
      video.removeEventListener("error", fail);
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [videoUrl]);

  return (
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
      {mime ? <source src={videoUrl} type={mime} /> : <source src={videoUrl} />}
    </video>
  );
}
