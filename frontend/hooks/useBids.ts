"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { getAnonymousTeeConnection } from "@/lib/ephemeralRollup";
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
 * Fetches Bid accounts for a deal. Bid accounts only ever exist on
 * MagicBlock's Private Ephemeral Rollup — place_bid creates them there
 * directly, never on L1 (see lib/ephemeralRollup.ts) — so this always
 * queries the TEE ER, not the wallet-adapter L1 connection.
 */
export function useBids(dealPublicKey: string) {
  const { wallet } = useWallet();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const erConnection = await getAnonymousTeeConnection();
      const program = sealedAuctionProgram(
        erConnection,
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
  }, [wallet, dealPublicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { bids, loading, refresh };
}
