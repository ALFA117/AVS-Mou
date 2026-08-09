"use client";

import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { formatTokenAmount } from "@/lib/format";

const COLORS = ["var(--primary)", "var(--accent)", "#0EA5E9", "#F59E0B", "#64748B", "#94A3B8"];

// Pie slices rely on color alone unless paired with a direct % label — this
// draws that label outside the donut so it stays legible for colorblind users.
function renderPercentLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) {
    return null;
  }
  const RADIAN = Math.PI / 180;
  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 1.4;
  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--muted-foreground)" fontSize={11} textAnchor={x > Number(cx) ? "start" : "end"} dominantBaseline="central">
      {`${Math.round((percent ?? 0) * 100)}%`}
    </text>
  );
}

/**
 * Split out of app/analytics/page.tsx and loaded via next/dynamic — see
 * PlatformActivityChart.tsx for why.
 */
export function AllocationPieChart({
  allocation,
  summary,
}: {
  allocation: { name: string; value: number }[];
  summary: string;
}) {
  return (
    <div className="h-56" role={summary ? "img" : undefined} aria-label={summary || undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={70} label={renderPercentLabel} labelLine={{ stroke: "var(--border)" }}>
            {allocation.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
          <Tooltip formatter={(v) => formatTokenAmount(Number(v ?? 0))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeInvestmentChart({
  cumulative,
  summary,
}: {
  cumulative: { name: string; invested: number }[];
  summary: string;
}) {
  return (
    <div className="h-56" role={summary ? "img" : undefined} aria-label={summary || undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cumulative}>
          <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis fontSize={12} stroke="var(--muted-foreground)" />
          <Tooltip />
          <Line type="monotone" dataKey="invested" stroke="var(--primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
