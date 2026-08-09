"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trophy } from "lucide-react";
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
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <AnimatePresence>
        {sorted.map((bid, index) => {
          const isYou = currentUser && bid.bidder === currentUser;
          const isTop = index === 0;
          // The winner lands last — everyone else flips in first, so the
          // top bid gets its own beat instead of blending into the crowd.
          const revealOrder = sorted.length - 1 - index;
          return (
            <motion.div
              key={bid.publicKey}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
              transition={{
                delay: reduceMotion ? 0 : revealOrder * 0.06,
                type: "spring",
                stiffness: isTop ? 220 : 260,
                damping: isTop ? 18 : 22,
              }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              className={`rounded-lg border bg-card p-4 transition-shadow duration-200 hover:shadow-md hover:shadow-primary/5 ${
                isTop ? "avs-glow-primary border-primary bg-primary-subdued" : isYou ? "border-primary/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">
                  {shortenAddress(bid.bidder)}
                  {isYou && ` ${t("revealAnimation.you")}`}
                </span>
                {isTop ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                    {t("revealAnimation.topBid")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                )}
              </div>
              <p className="mt-2 font-mono-avs text-xl font-semibold text-card-foreground">
                {formatTokenAmount(bid.amount)}
              </p>
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
