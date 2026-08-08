"use client";

import { useMemo, useState } from "react";
import { DealCard } from "@/components/DealCard";
import { useDeals } from "@/hooks/useDeals";
import type { Deal } from "@/lib/types";

type StatusFilter = "all" | Deal["status"];

export default function DealsPage() {
  const { deals, loading, error, refresh } = useDeals();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(
    () => (statusFilter === "all" ? deals : deals.filter((d) => d.status === statusFilter)),
    [deals, statusFilter],
  );

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

      <div className="mt-6 flex items-center gap-2">
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
        <button
          onClick={() => void refresh()}
          className="ml-auto text-sm text-neutral-500 hover:text-neutral-800"
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
          No {statusFilter === "all" ? "" : statusFilter} deals yet.
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
