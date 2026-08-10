import { MousePointerClick } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  PopupsManager,
  type AdminPopupRow,
} from "@/components/admin/marketing/popups-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Popups" };

export default async function AdminPopupsPage() {
  await requirePermission("marketing.view");

  const popups = await prisma.popupCampaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminPopupRow[] = popups.map((popup) => ({
    id: popup.id,
    name: popup.name,
    trigger: popup.trigger,
    content: popup.content as AdminPopupRow["content"],
    startsAt: popup.startsAt?.toISOString() ?? null,
    endsAt: popup.endsAt?.toISOString() ?? null,
    isActive: popup.isActive,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Popups"
        description="Configure on-site popup campaigns and triggers."
        actions={<MousePointerClick className="h-5 w-5 text-accent" aria-hidden />}
      />
      <PopupsManager popups={rows} />
    </div>
  );
}
