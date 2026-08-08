"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDeal } from "@/hooks/useDeal";
import { useBids } from "@/hooks/useBids";
import { useMilestones } from "@/hooks/useMilestones";
import { useSyndicate } from "@/hooks/useSyndicate";
import { Countdown } from "@/components/Countdown";
import { TransferEquityPanel } from "@/components/TransferEquityPanel";
import { formatEquity, formatTokenAmount, shortenAddress } from "@/lib/format";

/** `id` is the sealed-auction Deal's public key — a syndicate is 1:1 with its deal. */
export default function SyndicateDetailsPage({ params }: { params: { id: string } }) {
  const { publicKey } = useWallet();
  const { deal, loading } = useDeal(params.id);
  const { bids } = useBids(params.id);
  const { milestones } = useMilestones(deal?.startup);
  const { syndicate } = useSyndicate(params.id);

  const myBid = bids.find((b) => b.bidder === publicKey?.toBase58());

  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-neutral-500">Loading syndicate…</main>;
  }
  if (!deal) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-red-600">Syndicate not found.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Dashboard
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold">Syndicate — Deal #{deal.dealId}</h1>
      <p className="font-mono text-sm text-neutral-500">Startup: {shortenAddress(deal.startup)}</p>

      {myBid && (
        <div className="mt-6 rounded-lg border border-black bg-neutral-50 p-5">
          <h2 className="font-semibold">Your position</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-neutral-500">Bid amount</dt>
              <dd className="font-medium">{formatTokenAmount(myBid.amount)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Equity</dt>
              <dd className="font-medium">
                {Number(myBid.equityAllocated) > 0 ? formatEquity(myBid.equityAllocated) : "Pending settlement"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-xs text-neutral-500">Anonymous — equity share only, no identities shown.</p>
        <div className="mt-3 space-y-1">
          {deal.status === "open" ? (
            <p className="text-sm text-neutral-400">🔒 Member list hidden until reveal ({deal.bidCount} sealed bids)</p>
          ) : (
            bids.map((b) => (
              <div key={b.publicKey} className="flex justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm">
                <span className="font-mono text-neutral-500">{shortenAddress(b.bidder)}</span>
                <span>{Number(b.equityAllocated) > 0 ? formatEquity(b.equityAllocated) : "—"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Milestones</h2>
          <Link href="/vote" className="text-sm underline">
            Go to vote
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {milestones.length === 0 && (
            <p className="text-sm text-neutral-500">No milestones proposed yet.</p>
          )}
          {milestones.map((m) => (
            <div key={m.publicKey} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm">
              <span>Milestone #{m.milestoneId}</span>
              <span className="flex items-center gap-2">
                {m.status === "open" ? <Countdown deadlineTs={m.deadlineTs} /> : m.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {myBid && syndicate && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Manage position</h2>
          <div className="mt-3">
            <TransferEquityPanel syndicate={syndicate} />
          </div>
        </section>
      )}

      {myBid && (
        <div className="mt-8">
          <Link
            href={`/chat/${deal.publicKey}`}
            className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Open syndicate chat
          </Link>
        </div>
      )}
    </main>
  );
}
