"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { BarChart3, CircleAlert } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePublicStats } from "@/hooks/usePublicStats";
import { formatInt, formatTokenAmount, shortenAddress } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Skeleton, SkeletonStat } from "@/components/Skeleton";
import { useTranslation } from "@/lib/LanguageContext";

const COLORS = ["var(--primary)", "var(--accent)", "#0EA5E9", "#F59E0B", "#64748B", "#94A3B8"];

const chartContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const chartItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
};

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

export default function AnalyticsPage() {
  const { publicKey } = useWallet();
  const { positions, loading } = usePortfolio();
  const { stats, loading: statsLoading } = usePublicStats();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

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

  const dealsByDeadlineSummary =
    stats && stats.dealsOverTime.length > 0
      ? t("analytics.dealsByDeadlineA11y", { count: stats.totalDeals, dates: stats.dealsOverTime.length })
      : "";

  const largestAllocation = allocation.length
    ? allocation.reduce((max, a) => (a.value > max.value ? a : max), allocation[0])
    : null;
  const allocationTotal = allocation.reduce((s, a) => s + a.value, 0);
  const allocationSummary =
    largestAllocation && allocationTotal > 0
      ? t("analytics.allocationBreakdownA11y", {
          count: allocation.length,
          name: largestAllocation.name,
          percent: Math.round((largestAllocation.value / allocationTotal) * 100),
        })
      : "";

  const cumulativeSummary =
    cumulative.length > 0
      ? t("analytics.cumulativeInvestmentA11y", {
          count: cumulative.length,
          total: formatTokenAmount(cumulative[cumulative.length - 1].invested * 10 ** 6),
        })
      : "";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">{t("analytics.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("analytics.subtitle")}</p>

      <section className="mt-6">
        {statsLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          </div>
        )}
        {!statsLoading && !stats && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
            <CircleAlert className="h-4 w-4" strokeWidth={2} />
            {t("analytics.loadError")}
          </p>
        )}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label={t("analytics.totalDeals")} value={<AnimatedNumber value={stats.totalDeals} format={formatInt} />} />
              <Stat
                label={t("analytics.capitalDeployed")}
                value={<AnimatedNumber value={Number(stats.totalCapitalDeployed)} format={formatTokenAmount} />}
              />
              <Stat label={t("analytics.syndicatesFormed")} value={<AnimatedNumber value={stats.syndicateCount} format={formatInt} />} />
              <Stat
                label={t("analytics.avgDealSize")}
                value={<AnimatedNumber value={Number(stats.avgDealSize)} format={formatTokenAmount} />}
              />
            </div>

            <motion.div
              initial={reduceMotion ? undefined : "hidden"}
              whileInView={reduceMotion ? undefined : "show"}
              viewport={{ once: true, margin: "-60px" }}
              variants={reduceMotion ? undefined : chartContainer}
              className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2"
            >
              <motion.div
                variants={reduceMotion ? undefined : chartItem}
                className="avs-elevate rounded-xl border border-border bg-card p-4"
              >
                <h2 className="text-sm font-medium text-card-foreground">{t("analytics.dealsByDeadline")}</h2>
                <div
                  className="h-56"
                  role={dealsByDeadlineSummary ? "img" : undefined}
                  aria-label={dealsByDeadlineSummary || undefined}
                >
                  {stats.dealsOverTime.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {t("analytics.noDealsYet")}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dealsOverTime} margin={{ top: 16 }}>
                        <XAxis dataKey="date" fontSize={10} stroke="var(--muted-foreground)" />
                        <YAxis fontSize={12} allowDecimals={false} stroke="var(--muted-foreground)" />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="count" position="top" fontSize={11} fill="var(--muted-foreground)" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              <motion.div
                variants={reduceMotion ? undefined : chartItem}
                className="avs-elevate rounded-xl border border-border bg-card p-4"
              >
                <h2 className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                  {t("analytics.leaderboard")}
                </h2>
                <div className="mt-2 space-y-1">
                  {stats.leaderboard.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("analytics.noBidsSettled")}</p>
                  )}
                  {stats.leaderboard.map((entry, i) => {
                    const isYou = publicKey && entry.investor === publicKey.toBase58();
                    return (
                      <div
                        key={entry.investor}
                        className={`flex items-center justify-between rounded-md text-sm ${
                          isYou ? "bg-primary-subdued px-2 py-1 -mx-2" : ""
                        }`}
                      >
                        <span className={isYou ? "text-foreground" : "text-muted-foreground"}>
                          #{i + 1} <span className="font-mono-avs">{shortenAddress(entry.investor)}</span>
                          {isYou && <span className="ml-1 font-medium text-primary">{t("common.you")}</span>}
                        </span>
                        <span className="font-mono-avs text-foreground">
                          {formatTokenAmount(entry.totalInvested)} ·{" "}
                          {t("analytics.dealsSuffix", { count: entry.dealCount, plural: entry.dealCount === 1 ? "" : "s" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-heading text-lg font-light tracking-tight text-foreground">{t("analytics.myStats")}</h2>
        {!publicKey ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("analytics.connectPrompt")}</p>
        ) : loading ? (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          </div>
        ) : positions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("analytics.noPositions")}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label={t("analytics.avgBidAmount")} value={<AnimatedNumber value={avgBid} format={formatTokenAmount} />} />
              <Stat label={t("analytics.dealsSettled")} value={<AnimatedNumber value={settledCount} format={formatInt} />} />
              <Stat label={t("analytics.totalPositions")} value={<AnimatedNumber value={positions.length} format={formatInt} />} />
            </div>

            <motion.div
              initial={reduceMotion ? undefined : "hidden"}
              whileInView={reduceMotion ? undefined : "show"}
              viewport={{ once: true, margin: "-60px" }}
              variants={reduceMotion ? undefined : chartContainer}
              className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2"
            >
              <motion.div
                variants={reduceMotion ? undefined : chartItem}
                className="avs-elevate rounded-xl border border-border bg-card p-4"
              >
                <h3 className="text-sm font-medium text-card-foreground">{t("analytics.allocationBreakdown")}</h3>
                <div
                  className="h-56"
                  role={allocationSummary ? "img" : undefined}
                  aria-label={allocationSummary || undefined}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={70}
                        label={renderPercentLabel}
                        labelLine={{ stroke: "var(--border)" }}
                      >
                        {allocation.map((_, i) => (
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
              </motion.div>

              <motion.div
                variants={reduceMotion ? undefined : chartItem}
                className="avs-elevate rounded-xl border border-border bg-card p-4"
              >
                <h3 className="text-sm font-medium text-card-foreground">{t("analytics.cumulativeInvestment")}</h3>
                <div
                  className="h-56"
                  role={cumulativeSummary ? "img" : undefined}
                  aria-label={cumulativeSummary || undefined}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulative}>
                      <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip />
                      <Line type="monotone" dataKey="invested" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="avs-elevate rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono-avs text-xl font-semibold text-card-foreground">{value}</p>
    </div>
  );
}
