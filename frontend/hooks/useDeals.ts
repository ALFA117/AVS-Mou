"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { mapDeal } from "@/lib/mappers";
import type { Deal } from "@/lib/types";

/** A read-only wallet stub — deal fetching doesn't need a connected wallet. */
const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read-only client cannot sign");
  },
  signAllTransactions: async () => {
    throw new Error("read-only client cannot sign");
  },
};

export function useDeals() {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const program = sealedAuctionProgram(
        connection,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet?.adapter as any) ?? READONLY_WALLET,
      );
      const accounts = await program.account.deal.all();
      setDeals(accounts.map((a) => mapDeal(a.publicKey, a.account)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { deals, loading, error, refresh };
}
