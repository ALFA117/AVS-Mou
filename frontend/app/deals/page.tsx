"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, RefreshCw, Rocket, PackageSearch, SlidersHorizontal } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";
import { useDeals } from "@/hooks/useDeals";
import { useTranslation } from "@/lib/LanguageContext";
import type { Deal } from "@/lib/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
};

type StatusFilter = "all" | Deal["status"];
type SortKey = "deadline" | "valuation" | "popularity";

const PAGE_SIZE = 12;

export default function DealsPage() {
  const { deals, loading, error, refresh } = useDeals();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minValuation, setMinValuation] = useState("");
  const [maxValuation, setMaxValuation] = useState("");
  const [minEquity, setMinEquity] = useState("");
  const [maxEquity, setMaxEquity] = useState("");

  const rangeFiltersActive =
    minValuation !== "" || maxValuation !== "" || minEquity !== "" || maxEquity !== "";

  function clearRangeFilters() {
    setMinValuation("");
    setMaxValuation("");
    setMinEquity("");
    setMaxEquity("");
  }
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();

  const STATUS_LABELS: Record<StatusFilter, string> = {
    all: t("deals.filterAll"),
    open: t("deals.filterOpen"),
    revealed: t("deals.filterRevealed"),
    settled: t("deals.filterSettled"),
  };

  const filtered = useMemo(() => {
    let result = statusFilter === "all" ? deals : deals.filter((d) => d.status === statusFilter);

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (d) =>
          d.dealId.toLowerCase().includes(query) ||
          d.startup.toLowerCase().includes(query) ||
          d.publicKey.toLowerCase().includes(query),
      );
    }

    // deal.valuation is a raw on-chain integer (6 decimals, same scale
    // formatTokenAmount displays) — scale the typed bound to match, or a
    // filter like "min 1,000,000" would compare against display units.
    if (minValuation !== "") {
      const min = Number(minValuation) * 10 ** 6;
      result = result.filter((d) => Number(d.valuation) >= min);
    }
    if (maxValuation !== "") {
      const max = Number(maxValuation) * 10 ** 6;
      result = result.filter((d) => Number(d.valuation) <= max);
    }
    if (minEquity !== "") {
      const min = Number(minEquity) * 100;
      result = result.filter((d) => d.equityBps >= min);
    }
    if (maxEquity !== "") {
      const max = Number(maxEquity) * 100;
      result = result.filter((d) => d.equityBps <= max);
    }

    const sorted = [...result];
    switch (sortKey) {
      case "valuation":
        sorted.sort((a, b) => Number(b.valuation) - Number(a.valuation));
        break;
      case "popularity":
        sorted.sort((a, b) => b.bidCount - a.bidCount);
        break;
      case "deadline":
      default:
        sorted.sort((a, b) => a.deadlineTs - b.deadlineTs);
    }
    return sorted;
  }, [deals, statusFilter, search, sortKey, minValuation, maxValuation, minEquity, maxEquity]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, search, sortKey, minValuation, maxValuation, minEquity, maxEquity]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">{t("deals.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("deals.subtitle")}</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Link
            href="/deals/new"
            className="flex items-center gap-1.5 avs-glow-primary rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
          >
            <Rocket className="h-3.5 w-3.5" strokeWidth={2} />
            {t("deals.createDeal")}
          </Link>
        </motion.div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["all", "open", "revealed", "settled"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex min-h-11 cursor-pointer items-center rounded-full px-3 text-sm font-medium transition-colors duration-200 ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}

        <div className="relative ml-2 min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("deals.searchPlaceholder")}
            className="w-full rounded-md border border-border bg-background py-1 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        >
          <option value="deadline">{t("deals.sortDeadline")}</option>
          <option value="valuation">{t("deals.sortValuation")}</option>
          <option value="popularity">{t("deals.sortPopularity")}</option>
        </select>

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-200 ${
            filtersOpen || rangeFiltersActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-border"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          {t("deals.filtersButton")}
        </button>

        <button
          onClick={() => void refresh()}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          {t("common.refresh")}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("deals.minValuation")}</span>
                <input
                  type="number"
                  min={0}
                  value={minValuation}
                  onChange={(e) => setMinValuation(e.target.value)}
                  className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("deals.maxValuation")}</span>
                <input
                  type="number"
                  min={0}
                  value={maxValuation}
                  onChange={(e) => setMaxValuation(e.target.value)}
                  className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("deals.minEquity")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={minEquity}
                  onChange={(e) => setMinEquity(e.target.value)}
                  className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("deals.maxEquity")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={maxEquity}
                  onChange={(e) => setMaxEquity(e.target.value)}
                  className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
              {rangeFiltersActive && (
                <button
                  onClick={clearRangeFilters}
                  className="cursor-pointer text-sm text-primary underline"
                >
                  {t("common.clearFilters")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {error && (
        <p className="mt-10 text-center text-red-600 dark:text-red-400">
          {t("deals.loadError")}: {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title={t("deals.emptyTitle")}
          description={
            statusFilter === "all"
              ? t("deals.noResultsAny")
              : t("deals.noResults", { status: STATUS_LABELS[statusFilter].toLowerCase() })
          }
          action={
            (search.trim() !== "" || statusFilter !== "all" || rangeFiltersActive) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  clearRangeFilters();
                }}
                className="cursor-pointer rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary-subdued"
              >
                {t("common.clearFilters")}
              </button>
            )
          }
        />
      )}

      <motion.div
        variants={reducedMotion ? undefined : container}
        initial={reducedMotion ? undefined : "hidden"}
        animate={reducedMotion ? undefined : "show"}
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visible.map((deal) => (
          <motion.div key={deal.publicKey} variants={reducedMotion ? undefined : item}>
            <DealCard deal={deal} />
          </motion.div>
        ))}
      </motion.div>

      {visibleCount < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="cursor-pointer rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
          >
            {t("deals.showMore", { remaining: filtered.length - visibleCount })}
          </button>
        </div>
      )}
    </main>
  );
}
