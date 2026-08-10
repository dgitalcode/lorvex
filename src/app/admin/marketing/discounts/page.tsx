import { Percent } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  DiscountsManager,
  type AdminDiscountRuleRow,
} from "@/components/admin/marketing/discounts-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Discount rules" };

export default async function AdminDiscountsPage() {
  await requirePermission("marketing.view");

  const rules = await prisma.discountRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminDiscountRuleRow[] = rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    type: rule.type,
    value: Number(rule.value),
    stackable: rule.stackable,
    startsAt: rule.startsAt?.toISOString() ?? null,
    endsAt: rule.endsAt?.toISOString() ?? null,
    isActive: rule.isActive,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Discount rules"
        description="Automatic discount rules applied at cart based on conditions."
        actions={<Percent className="h-5 w-5 text-accent" aria-hidden />}
      />
      <DiscountsManager rules={rows} />
    </div>
  );
}
