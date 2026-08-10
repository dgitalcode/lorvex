import { ShoppingCart } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  AbandonedManager,
  type AdminAbandonedCartRow,
} from "@/components/admin/marketing/abandoned-manager";
import { getEmailConfigStatus } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";

export const metadata = { title: "Abandoned carts" };

export default async function AdminAbandonedCartsPage() {
  await requirePermission("marketing.view");

  const snapshots = await prisma.abandonedCartSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: AdminAbandonedCartRow[] = snapshots.map((snapshot) => {
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    return {
      id: snapshot.id,
      email: snapshot.email,
      itemCount: items.length,
      total: Number(snapshot.total),
      currency: snapshot.currency,
      recovered: snapshot.recovered,
      remindedAt: snapshot.remindedAt?.toISOString() ?? null,
      createdAt: snapshot.createdAt.toISOString(),
    };
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Abandoned carts"
        description="Snapshot inactive carts and send recovery reminder emails."
        actions={<ShoppingCart className="h-5 w-5 text-accent" aria-hidden />}
      />
      <AbandonedManager snapshots={rows} emailStatus={getEmailConfigStatus()} />
    </div>
  );
}
