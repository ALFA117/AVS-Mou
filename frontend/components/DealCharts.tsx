"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Lock } from "lucide-react";
import { formatTokenAmount } from "@/lib/format";
import type { Bid, Deal } from "@/lib/types";

// CSS custom properties resolve fine as SVG fill values, so these charts
// stay theme-aware without a JS-side dark-mode branch.
const COLORS = ["var(--primary)", "var(--accent)", "var(--muted-foreground)"];

export function DealCharts({ deal, bids }: { deal: Deal; bids: Bid[] }) {
  const raiseData = [
    { name: "Raised", value: Number(deal.totalRaised) || bids.reduce((s, b) => s + Number(b.amount), 0) },
    { name: "Remaining to cap", value: Math.max(Number(deal.maxCap) - Number(deal.totalRaised), 0) },
  ];

  const bidDistribution = [...bids]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((b) => ({ name: b.bidder.slice(0, 4), amount: Number(b.amount) / 10 ** 6 }));

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-medium text-card-foreground">Raise progress</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={raiseData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {raiseData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatTokenAmount(Number(v ?? 0))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-medium text-card-foreground">
          {deal.status === "open" ? "Sealed — visible only after reveal" : "Top bid amounts"}
        </h4>
        <div className="h-48">
          {deal.status === "open" ? (
            <div className="flex h-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" strokeWidth={2} />
              Hidden until reveal
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bidDistribution}>
                <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
