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
import { Skeleton } from "@/components/Skeleton";
import { useTranslation } from "@/lib/LanguageContext";
import { formatEquity, formatTokenAmount, shortenAddress } from "@/lib/format";

/** `id` is the sealed-auction Deal's public key — a syndicate is 1:1 with its deal. */
export default function SyndicateDetailsPage({ params }: { params: { id: string } }) {
  const { publicKey } = useWallet();
  const { deal, loading } = useDeal(params.id);
  const { bids } = useBids(params.id);
  const { milestones } = useMilestones(deal?.startup);
  const { syndicate } = useSyndicate(params.id);
  const { t } = useTranslation();

  const myBid = bids.find((b) => b.bidder === publicKey?.toBase58());

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-40" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-8 h-32 w-full" />
      </main>
    );
  }
  if (!deal) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-red-600 dark:text-red-400">
        {t("syndicatePage.notFound")}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {t("syndicatePage.dashboard")}
        </Link>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">
        {t("syndicatePage.title", { id: deal.dealId })}
      </h1>
      <p className="font-mono-avs text-sm text-muted-foreground">
        {t("syndicatePage.startup", { address: shortenAddress(deal.startup) })}
      </p>

      {myBid && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-card p-5">
          <h2 className="font-heading font-semibold text-card-foreground">{t("syndicatePage.yourPosition")}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("syndicatePage.bidAmount")}</dt>
              <dd className="font-mono-avs font-medium text-card-foreground">{formatTokenAmount(myBid.amount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("syndicatePage.equity")}</dt>
              <dd className="font-mono-avs font-medium text-card-foreground">
                {Number(myBid.equityAllocated) > 0
                  ? formatEquity(myBid.equityAllocated)
                  : t("syndicatePage.pendingSettlement")}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("syndicatePage.members")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("syndicatePage.anonymousNote")}</p>
        <div className="mt-3 space-y-1">
          {deal.status === "open" ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              {t("syndicatePage.memberListHidden", { count: deal.bidCount })}
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
            {t("syndicatePage.milestones")}
          </h2>
          <Link href="/vote" className="text-sm text-primary underline">
            {t("syndicatePage.goToVote")}
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {milestones.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("syndicatePage.noMilestones")}</p>
          )}
          {milestones.map((m) => (
            <div
              key={m.publicKey}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-foreground"
            >
              <span>{t("syndicatePage.milestone", { id: m.milestoneId })}</span>
              <span className="flex items-center gap-2">
                {m.status === "open" ? <Countdown deadlineTs={m.deadlineTs} /> : m.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {myBid && syndicate && (
        <section className="mt-8">
          <h2 className="font-heading text-lg font-semibold text-foreground">{t("syndicatePage.managePosition")}</h2>
          <div className="mt-3">
            <TransferEquityPanel syndicate={syndicate} />
          </div>
        </section>
      )}

      {myBid && (
        <div className="mt-8">
          <Link
            href={`/chat/${deal.publicKey}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
            {t("syndicatePage.openChat")}
          </Link>
        </div>
      )}
    </main>
  );
}
