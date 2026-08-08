"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatEquity, formatTokenAmount, shortenAddress } from "@/lib/format";
import type { Bid } from "@/lib/types";

/**
 * Card-flip reveal for settled bids — AVS_100_TASKS.md task 057. Renders
 * once a deal has moved to "revealed"/"settled" and bids are readable.
 */
export function RevealAnimation({ bids, currentUser }: { bids: Bid[]; currentUser?: string }) {
  const sorted = [...bids].sort((a, b) => Number(b.amount) - Number(a.amount));

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
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className={`rounded-lg border p-4 ${
                isYou ? "border-black bg-neutral-50" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-neutral-500">
                  {shortenAddress(bid.bidder)}
                  {isYou && " (you)"}
                </span>
                <span className="text-xs text-neutral-400">#{index + 1}</span>
              </div>
              <p className="mt-2 text-xl font-semibold">{formatTokenAmount(bid.amount)}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {Number(bid.equityAllocated) > 0
                  ? `${formatEquity(bid.equityAllocated)} equity`
                  : "Equity pending settlement"}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
