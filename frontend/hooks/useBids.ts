"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { mapBid } from "@/lib/mappers";
import type { Bid } from "@/lib/types";

const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read-only client cannot sign");
  },
  signAllTransactions: async () => {
    throw new Error("read-only client cannot sign");
  },
};

/**
 * Fetches settled Bid accounts for a deal. Bids are only readable
 * on-chain (from L1) once revealed/settled — before that they live sealed
 * on the ER and this will simply return an empty list.
 */
export function useBids(dealPublicKey: string) {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const program = sealedAuctionProgram(
        connection,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet?.adapter as any) ?? READONLY_WALLET,
      );
      const accounts = await program.account.bid.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: dealPublicKey,
          },
        },
      ]);
      setBids(accounts.map((a) => mapBid(a.publicKey, a.account)));
    } catch {
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, dealPublicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { bids, loading, refresh };
}
