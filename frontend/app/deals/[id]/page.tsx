"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDeal } from "@/hooks/useDeal";
import { useBids } from "@/hooks/useBids";
import { Countdown } from "@/components/Countdown";
import { BidForm } from "@/components/BidForm";
import { RevealAnimation } from "@/components/RevealAnimation";
import { DealCharts } from "@/components/DealCharts";
import { ShareDeal } from "@/components/ShareDeal";
import { formatBps, formatDate, formatTokenAmount, shortenAddress } from "@/lib/format";

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { deal, loading, error, refresh } = useDeal(params.id);
  const { bids, refresh: refreshBids } = useBids(params.id);
  const { publicKey } = useWallet();

  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-neutral-500">Loading deal…</main>;
  }
  if (error || !deal) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-red-600">Couldn&apos;t load this deal: {error ?? "not found"}</p>
        <Link href="/deals" className="mt-4 inline-block text-sm underline">
          Back to deals
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/deals" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← All deals
        </Link>
      </div>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deal #{deal.dealId}</h1>
          <p className="mt-1 font-mono text-sm text-neutral-500">
            Startup: {shortenAddress(deal.startup)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            deal.status === "open"
              ? "bg-green-100 text-green-800"
              : deal.status === "revealed"
                ? "bg-amber-100 text-amber-800"
                : "bg-neutral-200 text-neutral-700"
          }`}
        >
          {deal.status}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 p-5 sm:grid-cols-4">
        <Stat label="Valuation" value={formatTokenAmount(deal.valuation)} />
        <Stat label="Equity offered" value={formatBps(deal.equityBps)} />
        <Stat label="Min investment" value={formatTokenAmount(deal.minInvestment)} />
        <Stat label="Max cap" value={formatTokenAmount(deal.maxCap)} />
        <Stat label="Bidders" value={String(deal.bidCount)} />
        <Stat label="Vesting" value={`${deal.cliffMonths}mo cliff / ${deal.vestingMonths}mo`} />
        <Stat
          label={deal.status === "open" ? "Closes in" : "Deadline was"}
          value={deal.status === "open" ? <Countdown deadlineTs={deal.deadlineTs} /> : formatDate(deal.deadlineTs)}
        />
        <Stat label="Oversubscribed" value={deal.oversubscribed ? "Yes" : "No"} />
      </dl>

      <div className="mt-4">
        <ShareDeal
          dealTitle={`Deal #${deal.dealId}`}
          url={typeof window !== "undefined" ? window.location.href : ""}
        />
      </div>

      <div className="mt-8">
        <BidForm
          deal={deal}
          onBidPlaced={() => {
            void refresh();
            void refreshBids();
          }}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="mt-3">
          <DealCharts deal={deal} bids={bids} />
        </div>
      </section>

      {(deal.status === "revealed" || deal.status === "settled") && bids.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Syndicate (revealed)</h2>
          <div className="mt-3">
            <RevealAnimation bids={bids} currentUser={publicKey?.toBase58()} />
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
