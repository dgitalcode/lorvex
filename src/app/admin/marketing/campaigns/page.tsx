import { Mail } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  CampaignsManager,
  type AdminCampaignRow,
  type AdminFlashSaleRow,
} from "@/components/admin/marketing/campaigns-manager";
import { getEmailConfigStatus } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Campaigns" };

export default async function AdminCampaignsPage() {
  await requirePermission("marketing.view");

  const [campaigns, flashSales, products, collections, subscriberCount] =
    await Promise.all([
      prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.flashSale.findMany({
        include: {
          product: { select: { name: true } },
          collection: { select: { name: true } },
        },
        orderBy: { startsAt: "desc" },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 200,
      }),
      prisma.collection.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);

  const campaignRows: AdminCampaignRow[] = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    subject: campaign.subject,
    body: campaign.body,
    scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    stats: campaign.stats as AdminCampaignRow["stats"],
  }));

  const flashRows: AdminFlashSaleRow[] = flashSales.map((sale) => ({
    id: sale.id,
    name: sale.name,
    productName: sale.product?.name ?? null,
    collectionName: sale.collection?.name ?? null,
    salePrice: sale.salePrice ? Number(sale.salePrice) : null,
    percentOff: sale.percentOff ? Number(sale.percentOff) : null,
    startsAt: sale.startsAt.toISOString(),
    endsAt: sale.endsAt.toISOString(),
    isActive: sale.isActive,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Campaigns & flash sales"
        description="Email campaigns to newsletter subscribers and time-boxed flash sales."
        actions={<Mail className="h-5 w-5 text-accent" aria-hidden />}
      />
      <CampaignsManager
        campaigns={campaignRows}
        flashSales={flashRows}
        products={products}
        collections={collections}
        emailStatus={getEmailConfigStatus()}
        subscriberCount={subscriberCount}
      />
    </div>
  );
}
