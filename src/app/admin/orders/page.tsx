import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/server/auth/require-admin";
import { getOrdersForAdmin } from "@/server/actions/admin/orders";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Orders" };

type SearchParams = Promise<{
  q?: string;
  status?: string;
  paymentStatus?: string;
}>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("orders.view");
  const params = await searchParams;
  const orders = await getOrdersForAdmin({
    q: params.q,
    status: params.status,
    paymentStatus: params.paymentStatus,
  });

  const rows = orders.map((order) => ({
    id: order.id,
    number: order.number,
    createdAt: order.createdAt.toISOString(),
    email: order.email,
    itemCount: order._count.items,
    grandTotal: Number(order.grandTotal),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Manage fulfillment, tracking, refunds and returns."
        actions={
          <form action="/api/admin/orders/export" method="post">
            {params.status ? (
              <input type="hidden" name="status" value={params.status} />
            ) : null}
            {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
            <Button variant="outline" size="sm" type="submit">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </form>
        }
      />

      <form className="flex flex-wrap gap-3" action="/admin/orders" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search order # or email…"
          className="h-9 max-w-xs flex-1 border border-border bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 border border-border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {[
            "PENDING",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
          ].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          name="paymentStatus"
          defaultValue={params.paymentStatus ?? ""}
          className="h-9 border border-border bg-background px-3 text-sm"
        >
          <option value="">All payments</option>
          {["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {(params.q || params.status || params.paymentStatus) && (
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/admin/orders">Clear</Link>
          </Button>
        )}
      </form>

      <OrdersTable data={rows} />
    </div>
  );
}
