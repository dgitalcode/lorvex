"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SeriesPoint = {
  date: string;
  revenue: number;
  orders: number;
  visitors: number;
};

export function RevenueChart({ data }: { data: SeriesPoint[] }) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-2xl">Revenue & orders</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => String(v).slice(5)}
            />
            <YAxis tick={{ fontSize: 11 }} width={48} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 0,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--accent))"
              fill="url(#revenueFill)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="hsl(var(--foreground))"
              fill="transparent"
              name="Orders"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TrafficChart({
  data,
}: {
  data: { referrer: string; count: number }[];
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-2xl">Traffic sources</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No analytics events yet. Traffic will appear as visitors browse.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="referrer" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--accent))" name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function HeatmapGrid({
  data,
}: {
  data: { weekday: number; hour: number; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-2xl">Sales heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-[48px_repeat(24,minmax(0,1fr))] gap-1">
            <div />
            {Array.from({ length: 24 }).map((_, hour) => (
              <div
                key={hour}
                className="text-center text-[9px] text-muted-foreground"
              >
                {hour}
              </div>
            ))}
            {days.map((day, weekday) => (
              <div key={day} className="contents">
                <div className="flex items-center text-[10px] text-muted-foreground">
                  {day}
                </div>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const cell = data.find(
                    (d) => d.weekday === weekday && d.hour === hour,
                  );
                  const intensity = (cell?.count ?? 0) / max;
                  return (
                    <div
                      key={`${weekday}-${hour}`}
                      title={`${day} ${hour}:00 — ${cell?.count ?? 0}`}
                      className="aspect-square border border-border/50"
                      style={{
                        backgroundColor: `color-mix(in oklab, hsl(var(--accent)) ${Math.round(intensity * 100)}%, transparent)`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
