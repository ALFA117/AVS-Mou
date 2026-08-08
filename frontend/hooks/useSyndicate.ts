"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { splTokenManagerProgram, syndicatePda } from "@/lib/programs";
import { mapSyndicate } from "@/lib/mappers";
import type { Syndicate } from "@/lib/types";

const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read-only client cannot sign");
  },
  signAllTransactions: async () => {
    throw new Error("read-only client cannot sign");
  },
};

/** Fetches the spl-token-manager Syndicate for a deal, if one has been created yet. */
export function useSyndicate(dealPublicKey: string) {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [syndicate, setSyndicate] = useState<Syndicate | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const program = splTokenManagerProgram(
        connection,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet?.adapter as any) ?? READONLY_WALLET,
      );
      const pda = syndicatePda(new PublicKey(dealPublicKey));
      const account = await program.account.syndicate.fetchNullable(pda);
      setSyndicate(account ? mapSyndicate(pda, account as unknown as Record<string, unknown>) : null);
    } catch {
      setSyndicate(null);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, dealPublicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { syndicate, loading, refresh };
}
