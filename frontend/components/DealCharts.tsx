"use client";

import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { Lock, CircleCheck } from "lucide-react";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { Bid, Deal } from "@/lib/types";

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

  const raisedAmount = raiseData[0].value;
  const capAmount = raisedAmount + raiseData[1].value;
  const raisedPercent = capAmount > 0 ? Math.round((raisedAmount / capAmount) * 100) : 0;
  const raiseProgressSummary = t("dealCharts.raiseProgressA11y", {
    raised: formatTokenAmount(raisedAmount),
    cap: formatTokenAmount(capAmount),
    percent: raisedPercent,
  });

  const bidAmounts = bidDistribution.map((b) => b.amount);
  const numberFormat = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const topBidSummary =
    bidAmounts.length > 0
      ? t("dealCharts.topBidAmountsA11y", {
          count: bidAmounts.length,
          min: numberFormat(Math.min(...bidAmounts)),
          max: numberFormat(Math.max(...bidAmounts)),
        })
      : "";

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="avs-elevate flex flex-col rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-card-foreground">{t("dealCharts.raiseProgress")}</h3>
        {/* A ruled progress bar instead of a donut: one figure, one bar, one
            remainder — readable at a glance and honest when raised is 0. */}
        <div className="flex flex-1 flex-col justify-center py-4" role="img" aria-label={raiseProgressSummary}>
          <p className="font-heading text-4xl font-normal leading-none text-foreground">
            {raisedPercent}
            <span className="text-2xl text-muted-foreground">%</span>
          </p>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-sm bg-muted ring-1 ring-inset ring-border">
            <div
              className="h-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(Math.max(raisedPercent, raisedAmount > 0 ? 1 : 0), 100)}%` }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-primary" aria-hidden="true" />
                {t("dealCharts.raised")}
              </dt>
              <dd className="mt-0.5 font-mono-avs text-foreground">{formatTokenAmount(raisedAmount)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-muted ring-1 ring-inset ring-border-strong" aria-hidden="true" />
                {t("dealCharts.remainingToCap")}
              </dt>
              <dd className="mt-0.5 font-mono-avs text-foreground">{formatTokenAmount(raiseData[1].value)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="avs-elevate rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-card-foreground">
          {deal.status === "open" ? t("dealCharts.sealedHidden") : t("dealCharts.topBidAmounts")}
        </h3>
        <div className="h-48" role={bidDistribution.length > 0 ? "img" : undefined} aria-label={topBidSummary || undefined}>
          {deal.status === "open" ? (
            <div className="flex h-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" strokeWidth={2} />
              {t("dealCharts.hiddenUntilReveal")}
            </div>
          ) : bidDistribution.length === 0 && deal.status === "revealed" && deal.bidCount > deal.closedBidCount ? (
            // Revealed, but the bids were sealed with init_bid_permission:
            // only each bidder and the startup can read an individual amount,
            // the total above is what's public.
            <div className="flex h-full items-center justify-center gap-1.5 px-2 text-center text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t("dealCharts.bidsPrivate")}
            </div>
          ) : bidDistribution.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
              <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t("dealCharts.bidsSettled")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bidDistribution} margin={{ top: 16 }}>
                <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="amount" fill="var(--primary)" radius={[2, 2, 0, 0]}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    fontSize={12}
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
