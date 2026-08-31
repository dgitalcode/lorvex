"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, ScanBarcode, Search, X } from "lucide-react";
import { useLuxuryUiStore } from "@/stores/luxury-ui-store";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  matchType?: string;
};

function getSessionId() {
  const key = "lorvex-presence-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function SearchOverlay({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const open = useLuxuryUiStore((s) => s.searchOpen);
  const setSearchOpen = useLuxuryUiStore((s) => s.setSearchOpen);
  const reduce = useReducedMotion();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<"text" | "barcode">("text");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        setSuggestions([]);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setSearchOpen]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/search?q=&locale=${locale}&sessionId=${getSessionId()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { trending?: string[]; recent?: string[] } | null) => {
        if (!data) return;
        setTrending(data.trending ?? []);
        setRecent(data.recent ?? []);
      })
      .catch(() => undefined);
  }, [open, locale]);

  function closeOverlay() {
    setQuery("");
    setSuggestions([]);
    setListening(false);
    setMode("text");
    recognitionRef.current?.stop();
    setSearchOpen(false);
  }

  useEffect(() => {
    if (!open || !query.trim()) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&locale=${locale}&sessionId=${getSessionId()}&mode=${mode}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          results: Suggestion[];
          trending?: string[];
          recent?: string[];
        };
        setSuggestions(data.results.slice(0, 6));
        if (data.trending) setTrending(data.trending);
        if (data.recent) setRecent(data.recent);
      } catch {
        // ignore abort / network
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale, open, mode]);

  function startVoice() {
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
            onend: (() => void) | null;
            onerror: (() => void) | null;
            start: () => void;
            stop: () => void;
          };
          webkitSpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
            onend: (() => void) | null;
            onerror: (() => void) | null;
            start: () => void;
            stop: () => void;
          };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
            onend: (() => void) | null;
            onerror: (() => void) | null;
            start: () => void;
            stop: () => void;
          };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang =
      locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setMode("text");
        setQuery(transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const quickLinks = useMemo(
    () => [
      { href: `/${locale}/shop`, label: dictionary.nav.shop },
      { href: `/${locale}/shop?new=1`, label: dictionary.nav.newArrivals },
      { href: `/${locale}/shop?limited=1`, label: dictionary.nav.limited },
      { href: `/${locale}/collections`, label: dictionary.nav.collections },
    ],
    [dictionary, locale],
  );

  const visibleSuggestions = query.trim() ? suggestions : [];
  const chips = query.trim() ? [] : [...recent.slice(0, 3), ...trending.slice(0, 4)];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-background/85 px-4 pt-28 backdrop-blur-xl md:pt-36"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={closeOverlay}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label={dictionary.nav.search}
            className="w-full max-w-2xl max-h-[calc(100dvh-7rem)] overflow-y-auto border border-border bg-card p-6 shadow-[var(--shadow-lift)] md:p-8"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {dictionary.nav.search}
                {mode === "barcode" ? " · SKU / barcode" : ""}
              </p>
              <button
                type="button"
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center"
                onClick={closeOverlay}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="mt-6 flex items-center gap-3 border-b border-border pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                const q = query.trim();
                if (!q) return;
                startTransition(() => {
                  closeOverlay();
                  router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
                });
              }}
            >
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);
                  if (!next.trim()) setSuggestions([]);
                }}
                placeholder={
                  mode === "barcode"
                    ? locale === "en"
                      ? "Scan or type SKU / barcode…"
                      : "SKU / code-barres…"
                    : locale === "ar"
                      ? "ابحث عن ساعة…"
                      : locale === "en"
                        ? "Search a watch…"
                        : "Rechercher une montre…"
                }
                className="border-0 px-0 text-lg shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                aria-label="Voice search"
                aria-pressed={listening}
                onClick={startVoice}
                className={`flex h-9 w-9 items-center justify-center transition-colors ${listening ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Barcode search"
                aria-pressed={mode === "barcode"}
                onClick={() =>
                  setMode((m) => (m === "barcode" ? "text" : "barcode"))
                }
                className={`flex h-9 w-9 items-center justify-center transition-colors ${mode === "barcode" ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ScanBarcode className="h-4 w-4" />
              </button>
            </form>

            {chips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setQuery(chip)}
                    className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {visibleSuggestions.length > 0 && (
              <ul className="mt-6 space-y-1">
                {visibleSuggestions.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${locale}/product/${item.slug}`}
                      className="flex items-center justify-between px-2 py-3 transition-colors hover:bg-muted"
                      onClick={closeOverlay}
                    >
                      <span className="font-display text-xl">{item.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {item.brandName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeOverlay}
                  className="border border-border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {pending && (
              <p className="mt-4 text-xs text-muted-foreground">
                {dictionary.common.loading}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
