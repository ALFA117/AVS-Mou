"use client";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Lock } from "lucide-react";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { Bid, Deal } from "@/lib/types";

// CSS custom properties resolve fine as SVG fill values, so these charts
// stay theme-aware without a JS-side dark-mode branch.
const COLORS = ["var(--primary)", "var(--accent)", "var(--muted-foreground)"];

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
    <text
      x={x}
      y={y}
      fill="var(--muted-foreground)"
      fontSize={11}
      textAnchor={x > Number(cx) ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${Math.round((percent ?? 0) * 100)}%`}
    </text>
  );
}

export function DealCharts({ deal, bids }: { deal: Deal; bids: Bid[] }) {
  const { t } = useTranslation();
  const raiseData = [
    { name: t("dealCharts.raised"), value: Number(deal.totalRaised) || bids.reduce((s, b) => s + Number(b.amount), 0) },
    { name: t("dealCharts.remainingToCap"), value: Math.max(Number(deal.maxCap) - Number(deal.totalRaised), 0) },
  ];

  const bidDistribution = [...bids]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((b) => ({ name: b.bidder.slice(0, 4), amount: Number(b.amount) / 10 ** 6 }));

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="avs-elevate rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-card-foreground">{t("dealCharts.raiseProgress")}</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={raiseData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                label={renderPercentLabel}
                labelLine={{ stroke: "var(--border)" }}
              >
                {raiseData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
              />
              <Tooltip formatter={(v) => formatTokenAmount(Number(v ?? 0))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="avs-elevate rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-card-foreground">
          {deal.status === "open" ? t("dealCharts.sealedHidden") : t("dealCharts.topBidAmounts")}
        </h3>
        <div className="h-48">
          {deal.status === "open" ? (
            <div className="flex h-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" strokeWidth={2} />
              {t("dealCharts.hiddenUntilReveal")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bidDistribution} margin={{ top: 16 }}>
                <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                    formatter={(v) => Number(v ?? 0).toFixed(2)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
