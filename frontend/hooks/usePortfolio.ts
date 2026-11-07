"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { getAnonymousTeeConnection, getWalletErConnection, peekWalletErConnection } from "@/lib/ephemeralRollup";
import { mapBid, mapDeal } from "@/lib/mappers";
import type { Position } from "@/lib/types";

/**
 * A "position" is derived from the connected wallet's Bid accounts, joined
 * with their parent Deal — see Task 061/067. There's no separate Portfolio
 * account on-chain; this is entirely a client-side aggregation.
 */
export function usePortfolio() {
  const { connection } = useConnection();
  const { publicKey, wallet, signMessage } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  // Bids sealed with init_bid_permission are readable only by the bidder
  // and the startup — the anonymous TEE connection can't list them. Once
  // the wallet signs the TEE auth message (unlock), reads go through its
  // own identity and its sealed bids show up too.
  const [unlockCount, setUnlockCount] = useState(0);
  const unlocked = Boolean(peekWalletErConnection(publicKey));

  const refresh = useCallback(async () => {
    if (!publicKey || !wallet?.adapter) {
      setPositions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Bid accounts only ever exist on the ER (see useBids.ts); a Deal's
      // L1 copy is a frozen initialize_deal-time snapshot (see useDeals.ts)
      // — fetch each from wherever it's actually live, falling back to L1
      // for anything genuinely undelegated back.
      const erConnection = peekWalletErConnection(publicKey) ?? (await getAnonymousTeeConnection());
      const erProgram = sealedAuctionProgram(erConnection, wallet.adapter as never);
      const l1Program = sealedAuctionProgram(connection, wallet.adapter as never);

      const bidAccounts = await erProgram.account.bid.all([
        { memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } }, // deal(32) precedes bidder
      ]);
      const bids = bidAccounts.map((a) => mapBid(a.publicKey, a.account));

      const dealKeys = Array.from(new Set(bids.map((b) => new PublicKey(b.deal))));
      const [erDealAccounts, l1DealAccounts] = await Promise.all([
        erProgram.account.deal.fetchMultiple(dealKeys).catch(() => dealKeys.map(() => null)),
        l1Program.account.deal.fetchMultiple(dealKeys),
      ]);
      const dealsByKey = new Map(
        dealKeys
          .map((key, i) => {
            const raw = erDealAccounts[i] ?? l1DealAccounts[i];
            if (!raw) return null;
            const mapped = mapDeal(key, raw as unknown as Record<string, unknown>);
            return [mapped.publicKey, mapped] as const;
          })
          .filter((entry): entry is [string, ReturnType<typeof mapDeal>] => entry !== null),
      );

      const derived: Position[] = bids.map((bid) => {
        const deal = dealsByKey.get(bid.deal);
        return {
          dealPublicKey: bid.deal,
          dealTitle: deal ? `Deal #${deal.dealId}` : bid.deal.slice(0, 8),
          bidAmount: bid.amount,
          equityAllocated: bid.equityAllocated,
          entryDate: 0, // bid accounts don't record a timestamp on-chain — placement time isn't stored
          status: deal?.status === "settled" ? "liquidated" : deal?.status === "revealed" ? "voting" : "active",
        };
      });
      setPositions(derived);
    } catch {
      setPositions([]);
    } finally {
      setLoading(false);
    }
    // unlockCount: re-run after unlock() caches an authenticated connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, publicKey, wallet, unlockCount]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlock = useCallback(async () => {
    if (!publicKey || !signMessage) throw new Error("This wallet can't sign messages");
    await getWalletErConnection(publicKey, signMessage);
    setUnlockCount((n) => n + 1);
  }, [publicKey, signMessage]);

  return { positions, loading, refresh, unlocked, unlock, canUnlock: Boolean(signMessage) };
}
