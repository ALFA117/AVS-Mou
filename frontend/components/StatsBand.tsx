"use client";

import { usePublicStats } from "@/hooks/usePublicStats";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import { Skeleton } from "@/components/Skeleton";

export function StatsBand({ title, note }: { title: string; note?: string }) {
  const { stats, loading } = usePublicStats();
  const { t } = useTranslation();

  if (!loading && !stats) return null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="avs-eyebrow flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {title}
        </h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
        {loading || !stats ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat label={t("analytics.totalDeals")} value={String(stats.totalDeals)} />
            <Stat label={t("analytics.capitalDeployed")} value={formatTokenAmount(stats.totalCapitalDeployed)} />
            <Stat label={t("analytics.syndicatesFormed")} value={String(stats.syndicateCount)} />
            <Stat label={t("analytics.avgDealSize")} value={formatTokenAmount(stats.avgDealSize)} />
          </>
        )}
      </div>
    </div>
  );
}

const CELL =
  "border-border p-5 sm:p-6 [&:nth-child(odd)]:border-r [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0 lg:[&:not(:last-child)]:border-r";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={CELL}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-2 whitespace-nowrap font-display text-[1.6rem] leading-none text-card-foreground sm:text-4xl">{value}</p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className={CELL}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-28" />
    </div>
  );
}
