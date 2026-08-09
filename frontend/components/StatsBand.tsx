"use client";

import { usePublicStats } from "@/hooks/usePublicStats";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import { SkeletonStat } from "@/components/Skeleton";

export function StatsBand({ title }: { title: string }) {
  const { stats, loading } = usePublicStats();
  const { t } = useTranslation();

  if (!loading && !stats) return null;

  return (
    <div>
      <h2 className="text-center font-heading text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading || !stats ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="avs-elevate rounded-xl border border-border bg-card p-4 text-center">
      <p className="font-mono-avs text-xl font-semibold text-card-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
