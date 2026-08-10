import Link from "next/link";
import {
  AlertTriangle,
  Package,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import {
  HeatmapGrid,
  RevenueChart,
  TrafficChart,
} from "@/components/admin/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { requirePermission } from "@/server/auth/require-admin";
import {
  getDashboardMetrics,
  pctChange,
} from "@/server/repositories/admin/analytics";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requirePermission("dashboard.view");
  const metrics = await getDashboardMetrics(30);
  const { kpis } = metrics;

  const revenueTrend = pctChange(kpis.revenue, kpis.previousRevenue);
  const ordersTrend = pctChange(kpis.orders, kpis.previousOrders);
  const visitorsTrend = pctChange(kpis.visitors, kpis.previousVisitors);
  const conversionTrend = pctChange(kpis.conversion, kpis.previousConversion);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Realtime commerce health for the last 30 days."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/analytics">Custom reports</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/orders">Manage orders</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(kpis.revenue, "MAD")}
          icon={Wallet}
          hint="Excluding cancelled"
          trend={{
            value: `${revenueTrend > 0 ? "+" : ""}${revenueTrend}%`,
            positive: revenueTrend >= 0,
          }}
        />
        <StatCard
          label="Orders"
          value={kpis.orders.toLocaleString()}
          icon={ShoppingBag}
          trend={{
            value: `${ordersTrend > 0 ? "+" : ""}${ordersTrend}%`,
            positive: ordersTrend >= 0,
          }}
        />
        <StatCard
          label="Visitors"
          value={kpis.visitors.toLocaleString()}
          icon={Users}
          hint={`Conversion ${kpis.conversion}%`}
          trend={{
            value: `${visitorsTrend > 0 ? "+" : ""}${visitorsTrend}%`,
            positive: visitorsTrend >= 0,
          }}
        />
        <StatCard
          label="Catalog"
          value={kpis.products.toLocaleString()}
          icon={Package}
          hint={`${kpis.customers.toLocaleString()} customers`}
          trend={{
            value: `${conversionTrend > 0 ? "+" : ""}${conversionTrend}% conv.`,
            positive: conversionTrend >= 0,
          }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RevenueChart data={metrics.series} />
        <TrafficChart data={metrics.trafficSources} />
      </div>

      <HeatmapGrid data={metrics.heatmap} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-2xl">Recent orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {metrics.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No orders yet.
              </p>
            ) : (
              metrics.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="grid gap-1 py-3 text-sm transition-colors hover:bg-muted/40 sm:grid-cols-4"
                >
                  <strong>{order.number}</strong>
                  <span className="text-muted-foreground">{order.email}</span>
                  <span>{formatPrice(Number(order.grandTotal), order.currency)}</span>
                  <span className="sm:text-right">
                    <Badge variant="outline">{order.status}</Badge>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-2xl">
              Low stock alerts
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/inventory">Inventory</Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {metrics.lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Stock levels look healthy.
              </p>
            ) : (
              metrics.lowStock.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{variant.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant.name} · {variant.sku}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {variant.stock}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Top products</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-3">Product</th>
                <th className="pb-3">Units</th>
                <th className="pb-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.topProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No sales data yet.
                  </td>
                </tr>
              ) : (
                metrics.topProducts.map((product) => (
                  <tr key={product.productId}>
                    <td className="py-3 font-medium">{product.name}</td>
                    <td className="py-3 tabular-nums">{product.quantity}</td>
                    <td className="py-3 text-right tabular-nums">
                      {formatPrice(product.revenue, "MAD")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
