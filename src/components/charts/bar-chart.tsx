"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SimpleBarChart({
  data,
  xKey,
  yKey,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No chart data for this range.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey={yKey} fill="#0F766E" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
