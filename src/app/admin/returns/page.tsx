import Link from "next/link";
import { requirePermission } from "@/server/auth/require-admin";
import { getReturnRequestsForAdmin } from "@/server/actions/admin/orders";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ReturnsTable } from "@/components/admin/returns/returns-table";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Returns" };

export default async function AdminReturnsPage() {
  await requirePermission("orders.refund");
  const returns = await getReturnRequestsForAdmin();

  const rows = returns.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.order.number,
    email: r.order.email,
    reason: r.reason,
    status: r.status,
    itemSummary: r.items
      .map((i) => `${i.quantity}× ${i.orderItem.name}`)
      .join(", "),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Returns"
        description="Review and process customer return requests."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">View orders</Link>
          </Button>
        }
      />
      <ReturnsTable data={rows} />
    </div>
  );
}
