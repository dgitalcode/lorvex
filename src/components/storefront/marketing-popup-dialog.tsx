"use client";

import { StorefrontImage } from "@/components/shared/storefront-image";
import { isCloudinaryImageUrl } from "@/lib/cloudinary-image-url";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDirection } from "@/i18n/get-dictionary";
import type { Locale } from "@/config/site";
import {
  isInternalPopupHref,
  type PopupEligiblePayload,
} from "@/lib/marketing-popup";

const CLOSE: Record<Locale, string> = {
  fr: "Fermer",
  en: "Close",
  ar: "إغلاق",
};

export function MarketingPopupDialog({
  campaign,
  open,
  onOpenChange,
  onCta,
  preview = false,
}: {
  campaign: PopupEligiblePayload;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCta?: () => void;
  preview?: boolean;
}) {
  const dir = getDirection(campaign.locale);
  const href = campaign.ctaUrl;
  const showCta = Boolean(href && campaign.ctaLabel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        aria-describedby="lorvex-popup-body"
        className="max-w-md overflow-hidden border-border/80 bg-card p-0 motion-reduce:animate-none motion-reduce:duration-0 sm:max-w-lg"
      >
        {campaign.imageUrl ? (
          <div className="relative aspect-[16/9] w-full bg-muted">
            {isCloudinaryImageUrl(campaign.imageUrl) || campaign.imageUrl.startsWith("/") ? (
              <StorefrontImage
                src={campaign.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              // Next image remotePatterns do not allow arbitrary hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        ) : null}
        <div className="space-y-4 p-6 pt-8 sm:p-8">
          <DialogTitle className="text-balance text-[color:var(--hero-ink,#1c1916)]">
            {campaign.title}
          </DialogTitle>
          <DialogDescription
            id="lorvex-popup-body"
            className="text-base leading-relaxed text-muted-foreground"
          >
            {campaign.body}
          </DialogDescription>
          {showCta && href ? (
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <a
                href={href}
                rel={isInternalPopupHref(href) ? undefined : "noopener noreferrer"}
                onClick={() => {
                  if (!preview) onCta?.();
                }}
              >
                {campaign.ctaLabel}
              </a>
            </Button>
          ) : null}
          <p className="sr-only">{CLOSE[campaign.locale]}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
