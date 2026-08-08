"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CircleAlert } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePublicStats } from "@/hooks/usePublicStats";
import { formatTokenAmount } from "@/lib/format";

const COLORS = ["var(--primary)", "var(--accent)", "#0EA5E9", "#F59E0B", "#64748B", "#94A3B8"];

export default function AnalyticsPage() {
  const { publicKey } = useWallet();
  const { positions, loading } = usePortfolio();
  const { stats, loading: statsLoading } = usePublicStats();

  const allocation = useMemo(
    () => positions.map((p) => ({ name: p.dealTitle, value: Number(p.bidAmount) })),
    [positions],
  );

  const cumulative = useMemo(() => {
    let running = 0;
    return positions.map((p, i) => {
      running += Number(p.bidAmount);
      return { name: `#${i + 1}`, invested: running / 10 ** 6 };
    });
  }, [positions]);

  const avgBid = positions.length
    ? positions.reduce((s, p) => s + Number(p.bidAmount), 0) / positions.length
    : 0;
  const settledCount = positions.filter((p) => p.status === "liquidated").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Platform-wide stats are public — no wallet needed. Individual bid amounts stay
        sealed until each deal reveals.
      </p>

      <section className="mt-6">
        {statsLoading && <p className="text-sm text-muted-foreground">Loading platform stats…</p>}
        {!statsLoading && !stats && (
          <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
            <CircleAlert className="h-4 w-4" strokeWidth={2} />
            Couldn&apos;t load platform stats.
          </p>
        )}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Total deals" value={String(stats.totalDeals)} />
              <Stat label="Capital deployed" value={formatTokenAmount(stats.totalCapitalDeployed)} />
              <Stat label="Syndicates formed" value={String(stats.syndicateCount)} />
              <Stat label="Avg deal size" value={formatTokenAmount(stats.avgDealSize)} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-card-foreground">Deals by deadline date</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dealsOverTime}>
                      <XAxis dataKey="date" fontSize={10} stroke="var(--muted-foreground)" />
                      <YAxis fontSize={12} allowDecimals={false} stroke="var(--muted-foreground)" />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                  Leaderboard (anonymous, by total invested)
                </h3>
                <div className="mt-2 space-y-1">
                  {stats.leaderboard.length === 0 && (
                    <p className="text-sm text-muted-foreground">No sealed bids settled yet.</p>
                  )}
                  {stats.leaderboard.map((entry, i) => (
                    <div key={entry.investor} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        #{i + 1} <span className="font-mono-avs">{entry.investor}</span>
                      </span>
                      <span className="font-mono-avs text-foreground">
                        {formatTokenAmount(entry.totalInvested)} · {entry.dealCount} deal
                        {entry.dealCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-heading text-lg font-semibold text-foreground">My Stats</h2>
        {!publicKey ? (
          <p className="mt-4 text-sm text-muted-foreground">Connect your wallet to see your own stats.</p>
        ) : loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : positions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No positions yet.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Avg bid amount" value={formatTokenAmount(avgBid)} />
              <Stat label="Deals settled" value={String(settledCount)} />
              <Stat label="Total positions" value={String(positions.length)} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-card-foreground">Allocation breakdown</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={80}>
                        {allocation.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatTokenAmount(Number(v ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-card-foreground">Cumulative investment</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulative}>
                      <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip />
                      <Line type="monotone" dataKey="invested" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono-avs text-xl font-semibold text-card-foreground">{value}</p>
    </div>
  );
}
