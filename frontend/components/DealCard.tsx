"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Countdown } from "@/components/Countdown";
import { formatBps, formatTokenAmount, shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { Deal } from "@/lib/types";

export function DealCard({ deal }: { deal: Deal }) {
  const { t } = useTranslation();

  const STATUS_STYLES: Record<Deal["status"], string> = {
    open: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
    revealed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    settled: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 24 }}
    >
      <Link
        href={`/deals/${deal.publicKey}`}
        className="block avs-elevate rounded-xl border border-border bg-card p-5 transition-shadow duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">
            {shortenAddress(deal.startup)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[deal.status]}`}>
            {deal.status}
          </span>
        </div>
        <h2 className="mt-2 font-heading text-lg font-light tracking-tight text-card-foreground">
          Deal #{deal.dealId}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("dealCard.equityOffered")}</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">{formatBps(deal.equityBps)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("dealCard.minInvestment")}</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">{formatTokenAmount(deal.minInvestment)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("dealCard.raisedSoFar")}</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">
              {deal.status === "open"
                ? t("dealCard.sealedBids", { count: deal.bidCount })
                : formatTokenAmount(deal.totalRaised)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {deal.status === "open" ? t("dealCard.closesIn") : t("dealCard.status")}
            </dt>
            <dd className="font-medium">
              {deal.status === "open" ? <Countdown deadlineTs={deal.deadlineTs} /> : deal.status}
            </dd>
          </div>
        </dl>
      </Link>
    </motion.div>
  );
}
