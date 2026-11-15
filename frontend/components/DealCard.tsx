"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { formatBps, formatTokenAmount, shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { Deal } from "@/lib/types";

export function DealCard({ deal }: { deal: Deal }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const STATUS_STYLES: Record<Deal["status"], string> = {
    open: "border-green-700/30 bg-green-50 text-green-800 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300",
    revealed: "border-border-strong bg-primary-subdued text-primary",
    settled: "border-border bg-muted text-muted-foreground",
  };
  const STATUS_LABELS: Record<Deal["status"], string> = {
    open: t("dealCard.statusOpen"),
    revealed: t("dealCard.statusRevealed"),
    settled: t("dealCard.statusSettled"),
  };
  const AWAITING_REVEAL_STYLE =
    "border-amber-600/30 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300";

  // deal.status only flips from "open" once someone calls reveal_deal — a
  // deal whose deadline already passed stays "open" on-chain until then, so
  // showing the live green "open" badge next to a countdown that reads
  // "Closed" read as a contradiction (reported directly by a user testing
  // the app). Treat "open past its own deadline" as its own visual state.
  const awaitingReveal = deal.status === "open" && deal.deadlineTs * 1000 < Date.now();

  return (
    <motion.div
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="h-full"
    >
      <Link
        href={`/deals/${deal.publicKey}`}
        className="group flex h-full flex-col avs-elevate rounded-xl border border-border bg-card transition-colors duration-150 hover:border-border-strong"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs font-medium ${
              awaitingReveal ? AWAITING_REVEAL_STYLE : STATUS_STYLES[deal.status]
            }`}
          >
            {deal.status === "open" && !awaitingReveal && (
              <span className="relative flex h-1.5 w-1.5">
                {!reduceMotion && (
                  <motion.span
                    animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.8, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inline-flex h-full w-full rounded-full bg-green-600"
                  />
                )}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-700 dark:bg-green-400" />
              </span>
            )}
            {awaitingReveal ? t("dealCard.awaitingReveal") : STATUS_LABELS[deal.status]}
          </span>
          <span className="font-mono-avs text-xs text-muted-foreground">{shortenAddress(deal.startup)}</span>
        </div>
        <h2 className="mt-3 flex items-center justify-between gap-2 px-5 font-sans text-base font-medium tracking-normal text-card-foreground">
          <span className="truncate">Deal #{deal.dealId}</span>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transform-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        </h2>
        <dl className="mt-4 grid flex-1 grid-cols-2 border-t border-border text-sm">
          <div className="border-b border-r border-border px-5 py-3">
            <dt className="text-xs text-muted-foreground">{t("dealCard.equityOffered")}</dt>
            <dd className="mt-1 font-mono-avs text-card-foreground">{formatBps(deal.equityBps)}</dd>
          </div>
          <div className="border-b border-border px-5 py-3">
            <dt className="text-xs text-muted-foreground">{t("dealCard.minInvestment")}</dt>
            <dd className="mt-1 font-mono-avs text-card-foreground">{formatTokenAmount(deal.minInvestment)}</dd>
          </div>
          <div className="border-r border-border px-5 py-3">
            <dt className="text-xs text-muted-foreground">{t("dealCard.raisedSoFar")}</dt>
            <dd className="mt-1 font-mono-avs text-card-foreground">
              {deal.status === "open"
                ? deal.bidCount === 1
                  ? t("dealCard.sealedBidOne")
                  : t("dealCard.sealedBids", { count: deal.bidCount })
                : formatTokenAmount(deal.totalRaised)}
            </dd>
          </div>
          <div className="px-5 py-3">
            <dt className="text-xs text-muted-foreground">
              {deal.status === "open" && !awaitingReveal ? t("dealCard.closesIn") : t("dealCard.status")}
            </dt>
            <dd className="mt-1 text-card-foreground">
              {awaitingReveal ? (
                t("dealCard.awaitingReveal")
              ) : deal.status === "open" ? (
                <Countdown deadlineTs={deal.deadlineTs} />
              ) : (
                STATUS_LABELS[deal.status]
              )}
            </dd>
          </div>
        </dl>
      </Link>
    </motion.div>
  );
}
