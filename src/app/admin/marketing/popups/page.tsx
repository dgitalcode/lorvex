import { MousePointerClick } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  PopupsManager,
  type AdminPopupRow,
} from "@/components/admin/marketing/popups-manager";
import { prisma } from "@/lib/prisma";
import { parsePageTargets, type PopupContent } from "@/lib/marketing-popup";
import { requirePermission } from "@/server/auth/require-admin";
import { getPopupCampaignStats } from "@/server/repositories/marketing-popups";

export const metadata = { title: "Popups" };

export default async function AdminPopupsPage() {
  await requirePermission("marketing.view");

  const popups = await prisma.popupCampaign.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
  const stats = await getPopupCampaignStats(popups.map((popup) => popup.id));

  const rows: AdminPopupRow[] = popups.map((popup) => {
    const counts = stats.get(popup.id) ?? {
      impressions: 0,
      clicks: 0,
      dismissals: 0,
    };
    return {
      id: popup.id,
      name: popup.name,
      trigger: popup.trigger,
      delaySeconds: popup.delaySeconds,
      scrollPercent: popup.scrollPercent,
      pageTargets: parsePageTargets(popup.pageTargets),
      localeTarget: popup.localeTarget,
      deviceTarget: popup.deviceTarget,
      audience: popup.audience,
      frequency: popup.frequency,
      priority: popup.priority,
      imageUrl: popup.imageUrl,
      content: popup.content as PopupContent,
      startsAt: popup.startsAt?.toISOString() ?? null,
      endsAt: popup.endsAt?.toISOString() ?? null,
      isActive: popup.isActive,
      impressions: counts.impressions,
      clicks: counts.clicks,
      dismissals: counts.dismissals,
    };
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Popups"
        description="On-site campaigns with schedule, targeting, and frequency. Only one popup shows at a time."
        actions={<MousePointerClick className="h-5 w-5 text-accent" aria-hidden />}
      />
      <PopupsManager popups={rows} />
    </div>
  );
}
