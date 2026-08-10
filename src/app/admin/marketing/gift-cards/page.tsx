import { Gift } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  GiftCardsManager,
  type AdminGiftCardRow,
} from "@/components/admin/marketing/gift-cards-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Gift cards" };

export default async function AdminGiftCardsPage() {
  await requirePermission("marketing.view");

  const giftCards = await prisma.giftCard.findMany({
    include: { owner: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminGiftCardRow[] = giftCards.map((card) => ({
    id: card.id,
    code: card.code,
    initialAmount: Number(card.initialAmount),
    balance: Number(card.balance),
    currency: card.currency,
    isActive: card.isActive,
    expiresAt: card.expiresAt?.toISOString() ?? null,
    ownerEmail: card.owner?.email ?? null,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Gift cards"
        description="Issue and track gift card balances for customers."
        actions={<Gift className="h-5 w-5 text-accent" aria-hidden />}
      />
      <GiftCardsManager giftCards={rows} />
    </div>
  );
}
