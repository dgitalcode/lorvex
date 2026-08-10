import { toCsv, csvResponse } from "@/lib/export";
import { assertPermission } from "@/server/auth/require-admin";
import { getDashboardMetrics } from "@/server/repositories/admin/analytics";

function parseRange(value: string | null) {
  const parsed = Number(value);
  if ([7, 14, 30, 60, 90].includes(parsed)) return parsed;
  return 30;
}

export async function GET(request: Request) {
  try {
    await assertPermission("analytics.view");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rangeDays = parseRange(searchParams.get("range"));
  const metrics = await getDashboardMetrics(rangeDays);

  const csv = toCsv(
    metrics.series.map((row) => ({
      date: row.date,
      revenue: row.revenue,
      orders: row.orders,
      visitors: row.visitors,
    })),
  );

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`lorvex-analytics-${rangeDays}d-${date}.csv`, csv);
}
