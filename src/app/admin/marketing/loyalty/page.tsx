import { HeartHandshake } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  LoyaltyManager,
  type AdminLoyaltyRow,
  type AdminReferralRow,
} from "@/components/admin/marketing/loyalty-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Loyalty & referrals" };

export default async function AdminLoyaltyPage() {
  await requirePermission("marketing.view");

  const [accounts, referrals, customers] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.referralCode.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
      take: 500,
    }),
  ]);

  const accountRows: AdminLoyaltyRow[] = accounts.map((account) => ({
    id: account.id,
    userId: account.userId,
    userEmail: account.user.email,
    userName: account.user.name,
    points: account.points,
    tier: account.tier,
    updatedAt: account.updatedAt.toISOString(),
  }));

  const referralRows: AdminReferralRow[] = referrals.map((referral) => ({
    id: referral.id,
    code: referral.code,
    userEmail: referral.user.email,
    uses: referral.uses,
    rewardPoints: referral.rewardPoints,
    createdAt: referral.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Loyalty & referrals"
        description="Manage loyalty points, tiers, and customer referral codes."
        actions={<HeartHandshake className="h-5 w-5 text-accent" aria-hidden />}
      />
      <LoyaltyManager
        accounts={accountRows}
        referrals={referralRows}
        customers={customers}
      />
    </div>
  );
}
