-- Storefront marketing popups: targeting, schedule helpers, frequency, priority.
-- Additive only. Existing PopupCampaign rows keep their content JSON.

ALTER TABLE "PopupCampaign" ADD COLUMN "delaySeconds" INTEGER;
ALTER TABLE "PopupCampaign" ADD COLUMN "scrollPercent" INTEGER;
ALTER TABLE "PopupCampaign" ADD COLUMN "pageTargets" JSONB NOT NULL DEFAULT '["ALL"]';
ALTER TABLE "PopupCampaign" ADD COLUMN "localeTarget" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "PopupCampaign" ADD COLUMN "deviceTarget" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "PopupCampaign" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "PopupCampaign" ADD COLUMN "frequency" TEXT NOT NULL DEFAULT 'ONCE_PER_SESSION';
ALTER TABLE "PopupCampaign" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "PopupCampaign" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "PopupCampaign" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "PopupCampaign_isActive_priority_idx" ON "PopupCampaign"("isActive", "priority");
