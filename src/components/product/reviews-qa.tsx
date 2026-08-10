"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Camera, MessageCircleQuestion, Star } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getPdpStrings } from "@/components/product/strings";
import type { PdpQuestion, PdpReview } from "@/components/product/types";
import type { Locale } from "@/config/site";
import { cn } from "@/lib/utils";

type ReviewFilter = "all" | "photos" | "verified" | 5 | 4 | 3 | 2 | 1;

export function ReviewsSection({
  reviews,
  locale,
}: {
  reviews: PdpReview[];
  locale: Locale;
}) {
  const t = getPdpStrings(locale);
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const distribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviews.filter((r) => r.rating === rating).length,
      })),
    [reviews],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    if (filter === "photos") return reviews.filter((r) => r.images.length > 0);
    if (filter === "verified") return reviews.filter((r) => r.verified);
    return reviews.filter((r) => r.rating === filter);
  }, [reviews, filter]);

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-MA",
    { day: "numeric", month: "long", year: "numeric" },
  );

  if (!reviews.length) {
    return (
      <p className="mt-8 text-muted-foreground">{t.noReviews}</p>
    );
  }

  const chips: { key: ReviewFilter; label: string; count: number }[] = [
    { key: "all", label: t.allRatings, count: reviews.length },
    {
      key: "photos",
      label: t.withPhotos,
      count: reviews.filter((r) => r.images.length > 0).length,
    },
    {
      key: "verified",
      label: t.verifiedOnly,
      count: reviews.filter((r) => r.verified).length,
    },
  ];

  return (
    <div className="mt-8">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside>
          <div className="flex items-end gap-3">
            <p className="font-display text-6xl leading-none tabular-nums">
              {average.toFixed(1)}
            </p>
            <div className="pb-1">
              <div className="flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(average) && "fill-current",
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {reviews.length} {t.reviews.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {distribution.map(({ rating, count }) => (
              <button
                key={rating}
                type="button"
                onClick={() =>
                  setFilter(
                    filter === rating ? "all" : (rating as ReviewFilter),
                  )
                }
                className={cn(
                  "flex w-full items-center gap-3 text-xs transition-opacity",
                  filter !== "all" && filter !== rating
                    ? "opacity-45"
                    : "opacity-100",
                )}
              >
                <span className="w-3 tabular-nums">{rating}</span>
                <Star className="h-3 w-3 fill-current text-accent" />
                <span className="h-1 flex-1 bg-secondary">
                  <motion.span
                    initial={reduce ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="block h-full origin-left bg-accent"
                    style={{
                      width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className="w-5 text-right tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={String(chip.key)}
                type="button"
                aria-pressed={filter === chip.key}
                onClick={() => setFilter(chip.key)}
                className={cn(
                  "border px-4 py-2 text-xs transition-colors duration-300",
                  filter === chip.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                )}
              >
                {chip.label} ({chip.count})
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={String(filter)}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 space-y-10"
            >
              {filtered.length ? (
                filtered.map((review) => (
                  <article
                    key={review.id}
                    className="border-b border-border/70 pb-10 last:border-0"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex gap-0.5 text-accent">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < review.rating && "fill-current",
                            )}
                          />
                        ))}
                      </span>
                      {review.verified && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-success">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {t.verifiedPurchase}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-2xl">
                      {review.title ?? "—"}
                    </h3>
                    <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
                      {review.body}
                    </p>
                    {review.images.length > 0 && (
                      <div className="mt-4 flex gap-2">
                        {review.images.map((image) => (
                          <button
                            key={image}
                            type="button"
                            aria-label={t.withPhotos}
                            onClick={() => setLightbox(image)}
                            className="group relative h-20 w-20 overflow-hidden border border-border/60 bg-secondary"
                          >
                            <Image
                              src={image}
                              alt={review.title ?? review.author}
                              fill
                              sizes="80px"
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {review.author} ·{" "}
                      {dateFormatter.format(new Date(review.createdAt))}
                    </p>
                  </article>
                ))
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="h-4 w-4" /> {t.noReviews}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={Boolean(lightbox)} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl border-0 bg-[#0c0b0a] p-4">
          <DialogTitle className="sr-only">{t.withPhotos}</DialogTitle>
          {lightbox && (
            <div className="relative aspect-square w-full">
              <Image
                src={lightbox}
                alt=""
                fill
                sizes="768px"
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function QuestionsSection({
  questions,
  locale,
}: {
  questions: PdpQuestion[];
  locale: Locale;
}) {
  const t = getPdpStrings(locale);

  if (!questions.length) {
    return <p className="mt-8 text-muted-foreground">{t.noQuestions}</p>;
  }

  return (
    <div className="mt-8 space-y-8">
      {questions.map((q) => (
        <article key={q.id} className="border-b border-border/70 pb-8 last:border-0">
          <div className="flex items-start gap-3">
            <MessageCircleQuestion className="mt-1 h-4 w-4 shrink-0 text-accent" />
            <div>
              <h3 className="font-medium leading-relaxed">{q.question}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.askedBy} {q.author}
              </p>
            </div>
          </div>
          {q.answers.map((a) => (
            <div
              key={a.id}
              className="ml-7 mt-4 border-l-2 border-accent/60 pl-4 text-sm"
            >
              <p className="leading-7">{a.answer}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {a.author}
                {a.official && (
                  <span className="text-accent"> · {t.official}</span>
                )}
              </p>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
