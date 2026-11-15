"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDeal } from "@/hooks/useDeal";
import { useBids } from "@/hooks/useBids";
import { Countdown } from "@/components/Countdown";
import { BidForm } from "@/components/BidForm";
import { RevealSettlePanel } from "@/components/RevealSettlePanel";
import { RevealAnimation } from "@/components/RevealAnimation";
import { ShareDeal } from "@/components/ShareDeal";
import { Skeleton } from "@/components/Skeleton";
import { useTranslation } from "@/lib/LanguageContext";
import { formatBps, formatDate, formatInt, formatTokenAmount, shortenAddress } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const STATUS_STYLES: Record<string, string> = {
  open: "border-green-700/30 bg-green-50 text-green-800 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300",
  revealed: "border-amber-600/30 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300",
  settled: "border-border bg-muted text-muted-foreground",
};

// recharts pulls in a meaningful chunk of JS — split it out of this route's
// main bundle instead of loading it before there's even a deal to chart.
const DealCharts = dynamic(() => import("@/components/DealCharts").then((m) => m.DealCharts), {
  loading: () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  ),
});

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { deal, loading, error, refresh } = useDeal(params.id);
  const { bids, refresh: refreshBids } = useBids(params.id);
  const { publicKey } = useWallet();
  const { t } = useTranslation();

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Skeleton className="h-4 w-20" />
        <div className="mt-4 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-32 w-full" />
        <Skeleton className="mt-8 h-48 w-full" />
      </main>
    );
  }
  if (error || !deal) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p role="alert" className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <CircleAlert className="h-4 w-4" strokeWidth={2} />
          {t("dealDetail.loadError")}: {error ?? t("dealDetail.notFound")}
        </p>
        <Link href="/deals" className="mt-4 inline-block text-sm text-primary underline">
          {t("dealDetail.backToDeals")}
        </Link>
      </main>
    );
  }

  // deal.status only flips from "open" once someone calls reveal_deal — a
  // deal whose deadline already passed stays "open" on-chain until then, so
  // pairing the live "open" badge with a countdown reading "Closed" read as
  // a contradiction (reported directly by a user testing the app). See
  // components/DealCard.tsx for the identical fix on the list view.
  const awaitingReveal = deal.status === "open" && deal.deadlineTs * 1000 < Date.now();

  return (
    <motion.main
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <Link
        href="/deals"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {t("dealDetail.allDeals")}
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <span
            className={`inline-flex rounded-sm border px-1.5 py-0.5 text-xs font-medium ${
              awaitingReveal ? STATUS_STYLES.revealed : STATUS_STYLES[deal.status]
            }`}
          >
            {awaitingReveal
              ? t("dealCard.awaitingReveal")
              : deal.status === "open"
                ? t("dealCard.statusOpen")
                : deal.status === "revealed"
                  ? t("dealCard.statusRevealed")
                  : t("dealCard.statusSettled")}
          </span>
          <h1 className="mt-3 break-words font-heading text-3xl font-normal leading-tight text-foreground sm:text-4xl">
            Deal #{deal.dealId}
          </h1>
          <p className="mt-2 font-mono-avs text-sm text-muted-foreground">
            {t("dealDetail.startup", { address: shortenAddress(deal.startup) })}
          </p>
        </div>
        <ShareDeal
          dealTitle={`Deal #${deal.dealId}`}
          url={typeof window !== "undefined" ? window.location.href : ""}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="avs-eyebrow font-mono-avs">{t("dealDetail.terms")}</h2>
            <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4">
              <Stat label={t("dealDetail.valuation")} value={<AnimatedNumber value={Number(deal.valuation)} format={formatTokenAmount} />} />
              <Stat label={t("dealDetail.equityOffered")} value={<AnimatedNumber value={deal.equityBps} format={formatBps} />} />
              <Stat
                label={t("dealDetail.minInvestment")}
                value={<AnimatedNumber value={Number(deal.minInvestment)} format={formatTokenAmount} />}
              />
              <Stat label={t("dealDetail.maxCap")} value={<AnimatedNumber value={Number(deal.maxCap)} format={formatTokenAmount} />} />
              <Stat label={t("dealDetail.bidders")} value={<AnimatedNumber value={deal.bidCount} format={formatInt} />} />
              <Stat
                label={t("dealDetail.vestingLabel")}
                value={
                  <span className="whitespace-nowrap">
                    {deal.cliffMonths} / {deal.vestingMonths}
                    <span className="ml-1 font-body text-xs text-muted-foreground">{t("dealDetail.months")}</span>
                  </span>
                }
              />
              <Stat
                label={
                  awaitingReveal
                    ? t("dealCard.status")
                    : deal.status === "open"
                      ? t("dealDetail.closesIn")
                      : t("dealDetail.deadlineWas")
                }
                value={
                  awaitingReveal ? (
                    t("dealCard.awaitingReveal")
                  ) : deal.status === "open" ? (
                    <Countdown deadlineTs={deal.deadlineTs} />
                  ) : (
                    formatDate(deal.deadlineTs)
                  )
                }
              />
              <Stat label={t("dealDetail.oversubscribed")} value={deal.oversubscribed ? t("dealDetail.yes") : t("dealDetail.no")} />
            </dl>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-normal text-foreground">{t("dealDetail.analytics")}</h2>
            <div className="mt-4">
              <DealCharts deal={deal} bids={bids} />
            </div>
          </section>

          {(deal.status === "revealed" || deal.status === "settled") && bids.length > 0 && (
            <section>
              <h2 className="font-heading text-2xl font-normal text-foreground">{t("dealDetail.syndicateRevealed")}</h2>
              <div className="mt-4">
                <RevealAnimation bids={bids} currentUser={publicKey?.toBase58()} />
              </div>
            </section>
          )}
        </div>

        <aside className="order-first min-w-0 space-y-4 lg:order-none lg:sticky lg:top-24 lg:self-start">
          <BidForm
            deal={deal}
            onBidPlaced={() => {
              void refresh();
              void refreshBids();
            }}
          />
          <RevealSettlePanel
            deal={deal}
            bids={bids}
            onChanged={() => {
              void refresh();
              void refreshBids();
            }}
          />
        </aside>
      </div>
    </motion.main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-r border-border p-4 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-last-child(-n+4)]:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono-avs text-base text-card-foreground">{value}</dd>
    </div>
  );
}
