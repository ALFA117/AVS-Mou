"use client";

import Link from "next/link";
import { ArrowLeft, Lock, MessageSquare, Users, Milestone as MilestoneIcon } from "lucide-react";
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
    return <main className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Loading syndicate…</main>;
  }
  if (!deal) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-red-600 dark:text-red-400">Syndicate not found.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Dashboard
        </Link>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">
        Syndicate — Deal #{deal.dealId}
      </h1>
      <p className="font-mono-avs text-sm text-muted-foreground">Startup: {shortenAddress(deal.startup)}</p>

      {myBid && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-card p-5">
          <h2 className="font-heading font-semibold text-card-foreground">Your position</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Bid amount</dt>
              <dd className="font-mono-avs font-medium text-card-foreground">{formatTokenAmount(myBid.amount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Equity</dt>
              <dd className="font-mono-avs font-medium text-card-foreground">
                {Number(myBid.equityAllocated) > 0 ? formatEquity(myBid.equityAllocated) : "Pending settlement"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" strokeWidth={2} />
          Members
        </h2>
        <p className="text-xs text-muted-foreground">Anonymous — equity share only, no identities shown.</p>
        <div className="mt-3 space-y-1">
          {deal.status === "open" ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              Member list hidden until reveal ({deal.bidCount} sealed bids)
            </p>
          ) : (
            bids.map((b) => (
              <div key={b.publicKey} className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-mono-avs text-muted-foreground">{shortenAddress(b.bidder)}</span>
                <span className="text-foreground">
                  {Number(b.equityAllocated) > 0 ? formatEquity(b.equityAllocated) : "—"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <MilestoneIcon className="h-4 w-4 text-primary" strokeWidth={2} />
            Milestones
          </h2>
          <Link href="/vote" className="text-sm text-primary underline">
            Go to vote
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {milestones.length === 0 && (
            <p className="text-sm text-muted-foreground">No milestones proposed yet.</p>
          )}
          {milestones.map((m) => (
            <div
              key={m.publicKey}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-foreground"
            >
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
          <h2 className="font-heading text-lg font-semibold text-foreground">Manage position</h2>
          <div className="mt-3">
            <TransferEquityPanel syndicate={syndicate} />
          </div>
        </section>
      )}

      {myBid && (
        <div className="mt-8">
          <Link
            href={`/chat/${deal.publicKey}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
            Open syndicate chat
          </Link>
        </div>
      )}
    </main>
  );
}
