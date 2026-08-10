import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export async function getDashboardMetrics(rangeDays = 30) {
  const from = daysAgo(rangeDays);
  const previousFrom = daysAgo(rangeDays * 2);
  const previousTo = from;

  const orderWhere = {
    createdAt: { gte: from },
    status: { not: "CANCELLED" as const },
  };
  const previousWhere = {
    createdAt: { gte: previousFrom, lt: previousTo },
    status: { not: "CANCELLED" as const },
  };

  const [
    orders,
    previousOrders,
    revenueAgg,
    previousRevenueAgg,
    products,
    customers,
    visitors,
    previousVisitors,
    lowStock,
    recentOrders,
    topProductsRaw,
    eventsByDay,
    ordersByDay,
    trafficSources,
  ] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.order.count({ where: previousWhere }),
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { grandTotal: true },
    }),
    prisma.order.aggregate({
      where: previousWhere,
      _sum: { grandTotal: true },
    }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.analyticsEvent.count({
      where: { name: "page_view", createdAt: { gte: from } },
    }),
    prisma.analyticsEvent.count({
      where: {
        name: "page_view",
        createdAt: { gte: previousFrom, lt: previousTo },
      },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 3 } },
      take: 8,
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { stock: "asc" },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        email: true,
        grandTotal: true,
        currency: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "name"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    }),
    prisma.analyticsEvent.findMany({
      where: { name: "page_view", createdAt: { gte: from } },
      select: { createdAt: true },
    }),
    prisma.order.findMany({
      where: orderWhere,
      select: { createdAt: true, grandTotal: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["referrer"],
      where: {
        name: "page_view",
        createdAt: { gte: from },
        referrer: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 6,
    }),
  ]);

  const revenue = Number(revenueAgg._sum.grandTotal ?? 0);
  const previousRevenue = Number(previousRevenueAgg._sum.grandTotal ?? 0);
  const conversion =
    visitors > 0 ? Number(((orders / visitors) * 100).toFixed(2)) : 0;
  const previousConversion =
    previousVisitors > 0
      ? Number(((previousOrders / previousVisitors) * 100).toFixed(2))
      : 0;

  const dayMap = new Map<string, { date: string; revenue: number; orders: number; visitors: number }>();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, revenue: 0, orders: 0, visitors: 0 });
  }
  for (const order of ordersByDay) {
    const key = startOfDay(order.createdAt).toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (row) {
      row.orders += 1;
      row.revenue += Number(order.grandTotal);
    }
  }
  for (const event of eventsByDay) {
    const key = startOfDay(event.createdAt).toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (row) row.visitors += 1;
  }

  const heatmap = Array.from({ length: 7 }, (_, weekday) =>
    Array.from({ length: 24 }, (_, hour) => {
      const count = eventsByDay.filter((e) => {
        return e.createdAt.getDay() === weekday && e.createdAt.getHours() === hour;
      }).length;
      return { weekday, hour, count };
    }),
  ).flat();

  return {
    rangeDays,
    kpis: {
      revenue,
      previousRevenue,
      orders,
      previousOrders,
      visitors,
      previousVisitors,
      conversion,
      previousConversion,
      products,
      customers,
    },
    series: Array.from(dayMap.values()),
    recentOrders,
    lowStock,
    topProducts: topProductsRaw.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item._sum.quantity ?? 0,
      revenue: Number(item._sum.totalPrice ?? 0),
    })),
    trafficSources: trafficSources.map((item) => ({
      referrer: item.referrer || "Direct",
      count: item._count._all,
    })),
    heatmap,
  };
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}
