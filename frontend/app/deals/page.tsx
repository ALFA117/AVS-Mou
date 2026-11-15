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

// "open" here means open for bids (status open AND deadline still ahead);
// a deal past its deadline stays "open" on-chain until its startup runs
// reveal_deal, which the UI shows as its own "awaiting reveal" state.
type StatusFilter = "all" | "open" | "awaiting" | "revealed" | "settled";

function isBiddable(d: Deal, now: number): boolean {
  return d.status === "open" && d.deadlineTs * 1000 > now;
}

function matchesStatus(d: Deal, filter: StatusFilter, now: number): boolean {
  switch (filter) {
    case "all":
      return true;
    case "open":
      return isBiddable(d, now);
    case "awaiting":
      return d.status === "open" && !isBiddable(d, now);
    default:
      return d.status === filter;
  }
}
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
    awaiting: t("deals.filterAwaiting"),
    revealed: t("deals.filterRevealed"),
    settled: t("deals.filterSettled"),
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    let result = deals.filter((d) => matchesStatus(d, statusFilter, now));

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
        // Deals you can still bid on first (closing soonest first), then
        // everything else with the most recent deadline first — otherwise
        // the oldest long-closed deals bury the live ones.
        sorted.sort((a, b) => {
          const ab = isBiddable(a, now);
          const bb = isBiddable(b, now);
          if (ab !== bb) return ab ? -1 : 1;
          return ab ? a.deadlineTs - b.deadlineTs : b.deadlineTs - a.deadlineTs;
        });
    }
    return sorted;
  }, [deals, statusFilter, search, sortKey, minValuation, maxValuation, minEquity, maxEquity]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, search, sortKey, minValuation, maxValuation, minEquity, maxEquity]);

  // Restore filters from a shared/refreshed URL. Runs once after mount (not
  // during the lazy useState initializer) so the server-rendered HTML and
  // the client's first render both start from the same defaults — avoids a
  // hydration mismatch, at the cost of a one-frame flash of unfiltered
  // results on a link that carries filter params.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "open" || status === "awaiting" || status === "revealed" || status === "settled")
      setStatusFilter(status);
    const q = params.get("q");
    if (q) setSearch(q);
    const sort = params.get("sort");
    if (sort === "valuation" || sort === "popularity" || sort === "deadline") setSortKey(sort);
    const minVal = params.get("minVal");
    if (minVal) setMinValuation(minVal);
    const maxVal = params.get("maxVal");
    if (maxVal) setMaxValuation(maxVal);
    const minEq = params.get("minEq");
    if (minEq) setMinEquity(minEq);
    const maxEq = params.get("maxEq");
    if (maxEq) setMaxEquity(maxEq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync so a refresh or a shared link preserves the current
  // filters — direct history.replaceState (not next/navigation's router)
  // avoids opting this otherwise-static page into useSearchParams's
  // Suspense requirement, since none of this filtering touches the server.
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("q", search);
    if (sortKey !== "deadline") params.set("sort", sortKey);
    if (minValuation) params.set("minVal", minValuation);
    if (maxValuation) params.set("maxVal", maxValuation);
    if (minEquity) params.set("minEq", minEquity);
    if (maxEquity) params.set("maxEq", maxEquity);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const timer = setTimeout(() => {
      window.history.replaceState(null, "", url);
    }, 300);
    return () => clearTimeout(timer);
  }, [statusFilter, search, sortKey, minValuation, maxValuation, minEquity, maxEquity]);

  const visible = filtered.slice(0, visibleCount);
  const noSearchOrRange = search.trim() === "" && !rangeFiltersActive;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-normal leading-tight text-foreground sm:text-4xl">{t("deals.title")}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t("deals.subtitle")}</p>
        </div>
        <motion.div whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 24 }}>
          <Link
            href="/deals/new"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep"
          >
            <Rocket className="h-3.5 w-3.5" strokeWidth={2} />
            {t("deals.createDeal")}
          </Link>
        </motion.div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {/* Status chips and the search/sort controls wrap as two units, so
            a narrow row never strands a single control on its own line. */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "open", "awaiting", "revealed", "settled"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm font-medium transition-colors duration-200 ${
                statusFilter === s
                  ? "bg-ink text-ink-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex min-w-[min(100%,560px)] flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("deals.searchPlaceholder")}
              className="w-full rounded-md border border-border bg-card py-2.5 pl-8 pr-3 text-base text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-card px-2 py-2.5 text-base text-foreground"
          >
            <option value="deadline">{t("deals.sortDeadline")}</option>
            <option value="valuation">{t("deals.sortValuation")}</option>
            <option value="popularity">{t("deals.sortPopularity")}</option>
          </select>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors duration-200 ${
              filtersOpen || rangeFiltersActive
                ? "bg-ink text-ink-foreground"
                : "border border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            {t("deals.filtersButton")}
          </button>

          <button
            onClick={() => void refresh()}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 px-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            {t("common.refresh")}
          </button>
        </div>
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
                  className="w-28 rounded-md border border-border bg-card px-2 py-2.5 text-base text-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("deals.maxValuation")}</span>
                <input
                  type="number"
                  min={0}
                  value={maxValuation}
                  onChange={(e) => setMaxValuation(e.target.value)}
                  className="w-28 rounded-md border border-border bg-card px-2 py-2.5 text-base text-foreground"
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
                  className="w-24 rounded-md border border-border bg-card px-2 py-2.5 text-base text-foreground"
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
                  className="w-24 rounded-md border border-border bg-card px-2 py-2.5 text-base text-foreground"
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
        <div
          role="alert"
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          <p className="text-base">
            {t("deals.loadError")}: <span className="font-mono-avs text-sm">{error}</span>
          </p>
          <button
            onClick={() => void refresh()}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-red-300 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-red-500/30"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("common.refresh")}
          </button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title={t("deals.emptyTitle")}
          description={
            noSearchOrRange && statusFilter === "open"
              ? t("deals.noOpenDeals")
              : noSearchOrRange && statusFilter === "settled"
                ? t("deals.settledNote")
                : statusFilter === "all"
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
                className="cursor-pointer rounded-md border border-primary px-4 min-h-11 py-2 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary-subdued"
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
          <motion.div key={deal.publicKey} variants={reducedMotion ? undefined : item} className="h-full">
            <DealCard deal={deal} />
          </motion.div>
        ))}
      </motion.div>

      {visibleCount < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="inline-flex h-11 cursor-pointer items-center rounded-md border border-border-strong bg-card px-5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
          >
            {t("deals.showMore", { remaining: filtered.length - visibleCount })}
          </button>
        </div>
      )}
    </main>
  );
}
