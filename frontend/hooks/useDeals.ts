"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { ER_PUBLIC_RPC_URL } from "@/lib/ephemeralRollup";
import { mapDeal } from "@/lib/mappers";
import type { Deal } from "@/lib/types";

let erConnection: Connection | null = null;
function getErConnection(): Connection {
  erConnection ??= new Connection(ER_PUBLIC_RPC_URL, "confirmed");
  return erConnection;
}

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readonlyWallet = (wallet?.adapter as any) ?? READONLY_WALLET;
      const program = sealedAuctionProgram(connection, readonlyWallet);
      const erProgram = sealedAuctionProgram(getErConnection(), readonlyWallet);

      // A Deal's L1 owner moves to the delegation program the instant it's
      // created (see lib/ephemeralRollup.ts) — a plain L1 query only ever
      // finds deals that have since been undelegated. Merge in the ER's
      // copy (the live one for anything still Open) by pubkey, preferring
      // it on overlap.
      const [l1Accounts, erAccounts] = await Promise.all([
        program.account.deal.all(),
        erProgram.account.deal.all().catch(() => []),
      ]);
      const byPubkey = new Map(l1Accounts.map((a) => [a.publicKey.toBase58(), a]));
      for (const a of erAccounts) byPubkey.set(a.publicKey.toBase58(), a);
      setDeals(Array.from(byPubkey.values()).map((a) => mapDeal(a.publicKey, a.account)));
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
