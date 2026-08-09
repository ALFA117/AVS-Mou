"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatEquity, formatTokenAmount, shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { Bid } from "@/lib/types";

/**
 * Card-flip reveal for settled bids — AVS_100_TASKS.md task 057. Renders
 * once a deal has moved to "revealed"/"settled" and bids are readable.
 */
export function RevealAnimation({ bids, currentUser }: { bids: Bid[]; currentUser?: string }) {
  const sorted = [...bids].sort((a, b) => Number(b.amount) - Number(a.amount));
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <AnimatePresence>
        {sorted.map((bid, index) => {
          const isYou = currentUser && bid.bidder === currentUser;
          return (
            <motion.div
              key={bid.publicKey}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 22 }}
              whileHover={{ y: -2 }}
              className={`rounded-lg border bg-card p-4 transition-shadow duration-200 hover:shadow-md hover:shadow-primary/5 ${
                isYou ? "border-primary/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">
                  {shortenAddress(bid.bidder)}
                  {isYou && ` ${t("revealAnimation.you")}`}
                </span>
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-card-foreground">{formatTokenAmount(bid.amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(bid.equityAllocated) > 0
                  ? t("revealAnimation.equityAmount", { amount: formatEquity(bid.equityAllocated) })
                  : t("revealAnimation.equityPending")}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
