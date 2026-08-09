"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Countdown } from "@/components/Countdown";
import { formatBps, formatTokenAmount, shortenAddress } from "@/lib/format";
import type { Deal } from "@/lib/types";

const STATUS_STYLES: Record<Deal["status"], string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  revealed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  settled: "bg-muted text-muted-foreground",
};

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
      <Link
        href={`/deals/${deal.publicKey}`}
        className="block rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">
            {shortenAddress(deal.startup)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[deal.status]}`}>
            {deal.status}
          </span>
        </div>
        <h2 className="mt-2 font-heading text-lg font-semibold text-card-foreground">
          Deal #{deal.dealId}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Equity offered</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">{formatBps(deal.equityBps)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Min investment</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">{formatTokenAmount(deal.minInvestment)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Raised so far</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">
              {deal.status === "open" ? `${deal.bidCount} sealed bids` : formatTokenAmount(deal.totalRaised)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{deal.status === "open" ? "Closes in" : "Status"}</dt>
            <dd className="font-medium">
              {deal.status === "open" ? <Countdown deadlineTs={deal.deadlineTs} /> : deal.status}
            </dd>
          </div>
        </dl>
      </Link>
    </motion.div>
  );
}
