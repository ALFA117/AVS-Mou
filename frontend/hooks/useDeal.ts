"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { mapDeal } from "@/lib/mappers";
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

export function useDeal(publicKey: string) {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [deal, setDeal] = useState<Deal | null>(null);
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
      const pk = new PublicKey(publicKey);
      const account = await program.account.deal.fetch(pk);
      setDeal(mapDeal(pk, account as unknown as Record<string, unknown>));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeal(null);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, publicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { deal, loading, error, refresh };
}
