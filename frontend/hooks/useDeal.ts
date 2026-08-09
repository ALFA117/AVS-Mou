"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { getAnonymousTeeConnection } from "@/lib/ephemeralRollup";
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readonlyWallet = (wallet?.adapter as any) ?? READONLY_WALLET;
      const program = sealedAuctionProgram(connection, readonlyWallet);
      const pk = new PublicKey(publicKey);

      // A delegated deal's L1 copy is a frozen snapshot from the moment it
      // delegated — try the TEE ER's live copy first (see useDeals.ts /
      // lib/ephemeralRollup.ts), falling back to L1 for anything actually
      // undelegated back.
      let account: unknown;
      try {
        const erConnection = await getAnonymousTeeConnection();
        const erProgram = sealedAuctionProgram(erConnection, readonlyWallet);
        account = await erProgram.account.deal.fetch(pk);
      } catch {
        account = await program.account.deal.fetch(pk);
      }
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
