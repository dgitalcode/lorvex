import { toCsv, csvResponse } from "@/lib/export";
import { getDashboardMetrics } from "@/server/repositories/admin/analytics";
import {
  authorizeAdminSensitivePost,
  methodNotAllowedGet,
} from "@/server/auth/admin-sensitive-post";

function parseRange(value: string | null) {
  const parsed = Number(value);
  if ([7, 14, 30, 60, 90].includes(parsed)) return parsed;
  return 30;
}

export async function GET() {
  return methodNotAllowedGet();
}

export async function POST(request: Request) {
  const gate = await authorizeAdminSensitivePost(request, "analytics.view");
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  let rangeRaw = searchParams.get("range");
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("form")) {
    const form = await request.formData();
    rangeRaw = String(form.get("range") ?? rangeRaw ?? "");
  }
  const rangeDays = parseRange(rangeRaw);
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
