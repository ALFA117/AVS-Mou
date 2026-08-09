"use client";

import { BarChart, Bar, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "@/lib/LanguageContext";

/**
 * Split out of app/analytics/page.tsx and loaded via next/dynamic — recharts
 * is a meaningful chunk of JS that shouldn't ship with the rest of that
 * route's bundle before there's even data to chart.
 */
export function PlatformActivityChart({
  dealsOverTime,
  summary,
}: {
  dealsOverTime: { date: string; count: number }[];
  summary: string;
}) {
  const { t } = useTranslation();

  if (dealsOverTime.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        {t("analytics.noDealsYet")}
      </div>
    );
  }

  return (
    <div className="h-56" role={summary ? "img" : undefined} aria-label={summary || undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dealsOverTime} margin={{ top: 16 }}>
          <XAxis dataKey="date" fontSize={10} stroke="var(--muted-foreground)" />
          <YAxis fontSize={12} allowDecimals={false} stroke="var(--muted-foreground)" />
          <Tooltip />
          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="count" position="top" fontSize={11} fill="var(--muted-foreground)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
