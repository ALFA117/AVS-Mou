"use client";

import { useMemo, useState } from "react";
import { DealCard } from "@/components/DealCard";
import { useDeals } from "@/hooks/useDeals";
import type { Deal } from "@/lib/types";

type StatusFilter = "all" | Deal["status"];
type SortKey = "deadline" | "valuation" | "popularity";

export default function DealsPage() {
  const { deals, loading, error, refresh } = useDeals();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("deadline");

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
  }, [deals, statusFilter, search, sortKey]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sealed-bid syndicates — bid amounts stay private until reveal.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["all", "open", "revealed", "settled"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              statusFilter === s
                ? "bg-black text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by deal ID or startup address…"
          className="ml-2 min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-1 text-sm"
        />

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="deadline">Sort: Deadline</option>
          <option value="valuation">Sort: Valuation</option>
          <option value="popularity">Sort: Most bidders</option>
        </select>

        <button
          onClick={() => void refresh()}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="mt-10 text-center text-neutral-500">Loading deals…</p>}
      {error && (
        <p className="mt-10 text-center text-red-600">
          Couldn&apos;t load deals: {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">
          No {statusFilter === "all" ? "" : statusFilter} deals match your search.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((deal) => (
          <DealCard key={deal.publicKey} deal={deal} />
        ))}
      </div>
    </main>
  );
}
