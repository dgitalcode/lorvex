import { BadgePercent } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  CouponsManager,
  type AdminCouponRow,
} from "@/components/admin/marketing/coupons-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requirePermission("marketing.view");

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminCouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: Number(coupon.value),
    minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    usageLimit: coupon.usageLimit,
    usageCount: coupon.usageCount,
    perUserLimit: coupon.perUserLimit,
    startsAt: coupon.startsAt?.toISOString() ?? null,
    endsAt: coupon.endsAt?.toISOString() ?? null,
    isActive: coupon.isActive,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Coupons"
        description="Create and manage discount codes for checkout and promotions."
        actions={<BadgePercent className="h-5 w-5 text-accent" aria-hidden />}
      />
      <CouponsManager coupons={rows} />
    </div>
  );
}
