"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackPopupEvent } from "@/components/shared/analytics-tracker";
import { MarketingPopupDialog } from "@/components/storefront/marketing-popup-dialog";
import type { Locale } from "@/config/site";
import {
  classifyDevice,
  effectiveDelayMs,
  isFrequencyConsumed,
  popupStorageKey,
  resolveClientTrigger,
  type PopupEligiblePayload,
} from "@/lib/marketing-popup";

function readStoredAt(id: string, frequency: PopupEligiblePayload["frequency"]) {
  try {
    if (frequency === "EVERY_VISIT") return null;
    if (frequency === "ONCE_PER_SESSION") {
      const raw = sessionStorage.getItem(popupStorageKey(id));
      return raw ? Number(raw) : null;
    }
    const raw = localStorage.getItem(popupStorageKey(id));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function persistSeen(id: string, frequency: PopupEligiblePayload["frequency"]) {
  const now = Date.now();
  try {
    if (frequency === "EVERY_VISIT") return;
    if (frequency === "ONCE_PER_SESSION") {
      sessionStorage.setItem(popupStorageKey(id), String(now));
      return;
    }
    localStorage.setItem(popupStorageKey(id), String(now));
  } catch {
    /* private mode */
  }
}

export function MarketingPopupHost({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  return <MarketingPopupRuntime key={pathname} locale={locale} pathname={pathname} />;
}

function MarketingPopupRuntime({
  locale,
  pathname,
}: {
  locale: Locale;
  pathname: string;
}) {
  const [campaign, setCampaign] = useState<PopupEligiblePayload | null>(null);
  const [open, setOpen] = useState(false);
  const impressionRef = useRef<string | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let delayTimer = 0;
    let idleId = 0;
    const abort = new AbortController();

    const arm = (payload: PopupEligiblePayload) => {
      const device = classifyDevice(window.innerWidth);
      const trigger = resolveClientTrigger(payload.trigger, device);
      const delay = effectiveDelayMs(trigger, payload.delaySeconds);

      const reveal = () => {
        if (cancelled || shownRef.current) return;
        if (isFrequencyConsumed(payload.frequency, readStoredAt(payload.id, payload.frequency))) {
          return;
        }
        shownRef.current = true;
        setCampaign(payload);
        setOpen(true);
      };

      if (trigger === "SCROLL") {
        const threshold = (payload.scrollPercent ?? 50) / 100;
        const onScroll = () => {
          const doc = document.documentElement;
          const max = doc.scrollHeight - window.innerHeight;
          const ratio = max <= 0 ? 1 : window.scrollY / max;
          if (ratio >= threshold) {
            window.removeEventListener("scroll", onScroll);
            reveal();
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
      }

      if (trigger === "EXIT_INTENT") {
        const onLeave = (event: MouseEvent) => {
          if (event.clientY > 8) return;
          document.removeEventListener("mouseout", onLeave);
          reveal();
        };
        document.addEventListener("mouseout", onLeave);
        return () => document.removeEventListener("mouseout", onLeave);
      }

      delayTimer = window.setTimeout(reveal, delay);
      return () => window.clearTimeout(delayTimer);
    };

    const load = () => {
      const width = window.innerWidth;
      const url = `/api/marketing/popups?locale=${encodeURIComponent(locale)}&path=${encodeURIComponent(pathname)}&w=${width}`;
      void fetch(url, { signal: abort.signal, headers: { accept: "application/json" } })
        .then((res) => (res.ok ? res.json() : { campaign: null }))
        .then((data: { campaign?: PopupEligiblePayload | null }) => {
          if (cancelled || !data.campaign) return;
          const payload = data.campaign;
          if (isFrequencyConsumed(payload.frequency, readStoredAt(payload.id, payload.frequency))) {
            return;
          }
          const cleanup = arm(payload);
          abort.signal.addEventListener("abort", () => cleanup?.());
        })
        .catch(() => undefined);
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(load, { timeout: 2500 });
    } else {
      delayTimer = window.setTimeout(load, 600);
    }

    return () => {
      cancelled = true;
      abort.abort();
      if (idleId && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      window.clearTimeout(delayTimer);
    };
  }, [locale, pathname]);

  useEffect(() => {
    if (!open || !campaign) return;
    if (impressionRef.current === campaign.id) return;
    impressionRef.current = campaign.id;
    persistSeen(campaign.id, campaign.frequency);
    trackPopupEvent("popup_impression", campaign.id);
  }, [open, campaign]);

  if (!campaign) return null;

  return (
    <MarketingPopupDialog
      campaign={campaign}
      open={open}
      onOpenChange={(next) => {
        if (!next && open) {
          persistSeen(campaign.id, campaign.frequency);
          trackPopupEvent("popup_dismiss", campaign.id);
        }
        setOpen(next);
      }}
      onCta={() => {
        persistSeen(campaign.id, campaign.frequency);
        trackPopupEvent("popup_click", campaign.id);
      }}
    />
  );
}
