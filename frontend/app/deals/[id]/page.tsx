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
  open: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  revealed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  settled: "bg-muted text-muted-foreground",
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
      <main className="mx-auto max-w-3xl px-6 py-10">
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
      <main className="mx-auto max-w-3xl px-6 py-10">
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

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mx-auto max-w-3xl px-6 py-10"
    >
      <div className="flex items-center justify-between">
        <Link
          href="/deals"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {t("dealDetail.allDeals")}
        </Link>
      </div>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">Deal #{deal.dealId}</h1>
          <p className="mt-1 font-mono-avs text-sm text-muted-foreground">
            {t("dealDetail.startup", { address: shortenAddress(deal.startup) })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[deal.status]}`}>
          {deal.status}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 avs-elevate rounded-xl border border-border bg-card p-5 sm:grid-cols-4">
        <Stat label={t("dealDetail.valuation")} value={<AnimatedNumber value={Number(deal.valuation)} format={formatTokenAmount} />} />
        <Stat label={t("dealDetail.equityOffered")} value={<AnimatedNumber value={deal.equityBps} format={formatBps} />} />
        <Stat
          label={t("dealDetail.minInvestment")}
          value={<AnimatedNumber value={Number(deal.minInvestment)} format={formatTokenAmount} />}
        />
        <Stat label={t("dealDetail.maxCap")} value={<AnimatedNumber value={Number(deal.maxCap)} format={formatTokenAmount} />} />
        <Stat label={t("dealDetail.bidders")} value={<AnimatedNumber value={deal.bidCount} format={formatInt} />} />
        <Stat
          label={t("dealDetail.vesting")}
          value={t("dealDetail.vestingValue", { cliff: deal.cliffMonths, vesting: deal.vestingMonths })}
        />
        <Stat
          label={deal.status === "open" ? t("dealDetail.closesIn") : t("dealDetail.deadlineWas")}
          value={deal.status === "open" ? <Countdown deadlineTs={deal.deadlineTs} /> : formatDate(deal.deadlineTs)}
        />
        <Stat label={t("dealDetail.oversubscribed")} value={deal.oversubscribed ? t("dealDetail.yes") : t("dealDetail.no")} />
      </dl>

      <div className="mt-4">
        <ShareDeal
          dealTitle={`Deal #${deal.dealId}`}
          url={typeof window !== "undefined" ? window.location.href : ""}
        />
      </div>

      <div className="mt-8 space-y-4">
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
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-light tracking-tight text-foreground">{t("dealDetail.analytics")}</h2>
        <div className="mt-3">
          <DealCharts deal={deal} bids={bids} />
        </div>
      </section>

      {(deal.status === "revealed" || deal.status === "settled") && bids.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-lg font-light tracking-tight text-foreground">{t("dealDetail.syndicateRevealed")}</h2>
          <div className="mt-3">
            <RevealAnimation bids={bids} currentUser={publicKey?.toBase58()} />
          </div>
        </section>
      )}
    </motion.main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono-avs font-medium text-card-foreground">{value}</dd>
    </div>
  );
}
