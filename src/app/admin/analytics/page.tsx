import Link from "next/link";
import { ShoppingBag, Users, Wallet } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart, TrafficChart } from "@/components/admin/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";
import {
  getDashboardMetrics,
  pctChange,
} from "@/server/repositories/admin/analytics";
import { getTrendingSearches } from "@/server/services/search";

export const metadata = { title: "Analytics" };

const RANGE_OPTIONS = [7, 14, 30, 60, 90] as const;

function parseRange(value: string | undefined) {
  const parsed = Number(value);
  if (RANGE_OPTIONS.includes(parsed as (typeof RANGE_OPTIONS)[number])) {
    return parsed;
  }
  return 30;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission("analytics.view");
  const params = await searchParams;
  const rangeDays = parseRange(params.range);
  const from = new Date();
  from.setDate(from.getDate() - rangeDays);

  const [metrics, trendingSearches, funnel, aovAgg, searchCount, zeroResult] =
    await Promise.all([
      getDashboardMetrics(rangeDays),
      getTrendingSearches(8),
      prisma.analyticsEvent.groupBy({
        by: ["name"],
        where: {
          createdAt: { gte: from },
          name: {
            in: [
              "page_view",
              "product_view",
              "cart_view",
              "checkout_view",
              "add_to_cart",
              "purchase",
            ],
          },
        },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: from },
          status: { not: "CANCELLED" },
        },
        _avg: { grandTotal: true },
      }),
      prisma.searchQuery.count({ where: { createdAt: { gte: from } } }),
      prisma.searchQuery.count({
        where: { createdAt: { gte: from }, resultCount: 0 },
      }),
    ]);

  const { kpis } = metrics;
  const funnelMap = Object.fromEntries(
    funnel.map((f) => [f.name, f._count._all]),
  );
  const aov = Number(aovAgg._avg.grandTotal ?? 0);

  const revenueTrend = pctChange(kpis.revenue, kpis.previousRevenue);
  const ordersTrend = pctChange(kpis.orders, kpis.previousOrders);
  const visitorsTrend = pctChange(kpis.visitors, kpis.previousVisitors);
  const conversionTrend = pctChange(kpis.conversion, kpis.previousConversion);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Overview"
        title="Custom reports"
        description={`Commerce analytics for the last ${rangeDays} days.`}
        actions={
          <>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((range) => (
                <Button
                  key={range}
                  asChild
                  size="sm"
                  variant={range === rangeDays ? "default" : "outline"}
                >
                  <Link href={`/admin/analytics?range=${range}`}>{range}d</Link>
                </Button>
              ))}
            </div>
            <form action="/api/admin/analytics/export" method="post">
              <input type="hidden" name="range" value={String(rangeDays)} />
              <Button size="sm" variant="outline" type="submit">
                Export CSV
              </Button>
            </form>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(kpis.revenue, "MAD")}
          icon={Wallet}
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
          trend={{
            value: `${visitorsTrend > 0 ? "+" : ""}${visitorsTrend}%`,
            positive: visitorsTrend >= 0,
          }}
        />
        <StatCard
          label="Conversion"
          value={`${kpis.conversion}%`}
          hint={`AOV ${formatPrice(aov, "MAD")}`}
          trend={{
            value: `${conversionTrend > 0 ? "+" : ""}${conversionTrend}%`,
            positive: conversionTrend >= 0,
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Product views", funnelMap.product_view ?? 0],
          ["Cart views", funnelMap.cart_view ?? 0],
          ["Checkout views", funnelMap.checkout_view ?? 0],
          ["Searches", searchCount],
        ].map(([label, value]) => (
          <StatCard
            key={String(label)}
            label={String(label)}
            value={Number(value).toLocaleString()}
            hint={
              label === "Searches"
                ? `${zeroResult} zero-result`
                : "Funnel stage"
            }
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RevenueChart data={metrics.series} />
        <TrafficChart data={metrics.trafficSources} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
                    <td
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No sales data for this range.
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

        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              Trending searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendingSearches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Search analytics will appear as customers search.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {trendingSearches.map((term) => (
                  <li key={term} className="py-2.5 capitalize">
                    {term}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
