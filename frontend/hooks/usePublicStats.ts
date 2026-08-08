"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { mapBid, mapDeal } from "@/lib/mappers";
import type { Deal } from "@/lib/types";

const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read-only client cannot sign");
  },
  signAllTransactions: async () => {
    throw new Error("read-only client cannot sign");
  },
};

export interface LeaderboardEntry {
  /** First 4 + last 4 chars only — public leaderboard stays anonymous (Task 080). */
  investor: string;
  totalInvested: number;
  dealCount: number;
}

export interface PublicStats {
  totalDeals: number;
  totalCapitalDeployed: number;
  syndicateCount: number;
  avgDealSize: number;
  dealsOverTime: { date: string; count: number }[];
  leaderboard: LeaderboardEntry[];
}

/** Exported for testability — see hooks/__tests__/usePublicStats.test.ts. */
export function anonymize(pubkey: string): string {
  return `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`;
}

/**
 * Aggregates every Deal + Bid account on sealed-auction into platform-wide
 * public metrics (Task 076) and an anonymous investor leaderboard (Task
 * 080). No wallet needed — this is meant to be visible to anyone.
 */
export function usePublicStats() {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const program = sealedAuctionProgram(
        connection,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet?.adapter as any) ?? READONLY_WALLET,
      );
      const [dealAccounts, bidAccounts] = await Promise.all([
        program.account.deal.all(),
        program.account.bid.all(),
      ]);
      const deals: Deal[] = dealAccounts.map((a) => mapDeal(a.publicKey, a.account));
      const bids = bidAccounts.map((a) => mapBid(a.publicKey, a.account));

      const settledDeals = deals.filter((d) => d.status !== "open");
      const totalCapitalDeployed = settledDeals.reduce((sum, d) => sum + Number(d.totalRaised), 0);
      const syndicateCount = settledDeals.filter((d) => d.bidCount > 0).length;
      const avgDealSize = settledDeals.length > 0 ? totalCapitalDeployed / settledDeals.length : 0;

      // Bucket deals by deadline day — Deal has no created_at on-chain, so
      // "deals over time" tracks when each deal closes, not when it opened.
      const byDay = new Map<string, number>();
      for (const d of deals) {
        const date = new Date(d.deadlineTs * 1000).toISOString().slice(0, 10);
        byDay.set(date, (byDay.get(date) ?? 0) + 1);
      }
      const dealsOverTime = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      const byInvestor = new Map<string, { totalInvested: number; deals: Set<string> }>();
      for (const b of bids) {
        const entry = byInvestor.get(b.bidder) ?? { totalInvested: 0, deals: new Set() };
        entry.totalInvested += Number(b.amount);
        entry.deals.add(b.deal);
        byInvestor.set(b.bidder, entry);
      }
      const leaderboard: LeaderboardEntry[] = Array.from(byInvestor.entries())
        .map(([investor, v]) => ({
          investor: anonymize(investor),
          totalInvested: v.totalInvested,
          dealCount: v.deals.size,
        }))
        .sort((a, b) => b.totalInvested - a.totalInvested)
        .slice(0, 10);

      setStats({
        totalDeals: deals.length,
        totalCapitalDeployed,
        syndicateCount,
        avgDealSize,
        dealsOverTime,
        leaderboard,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
