"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { privateVotingProgram } from "@/lib/programs";
import { getAnonymousTeeConnection } from "@/lib/ephemeralRollup";
import { mapMilestone } from "@/lib/mappers";
import type { Milestone } from "@/lib/types";

const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read-only client cannot sign");
  },
  signAllTransactions: async () => {
    throw new Error("read-only client cannot sign");
  },
};

export function useMilestones(dealFilter?: string) {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readonlyWallet = (wallet?.adapter as any) ?? READONLY_WALLET;
      const program = privateVotingProgram(connection, readonlyWallet);
      const erConnection = await getAnonymousTeeConnection();
      const erProgram = privateVotingProgram(erConnection, readonlyWallet);
      const filters = dealFilter
        ? [{ memcmp: { offset: 8 + 32, bytes: dealFilter } }] // startup(32) precedes deal
        : [];

      // A Milestone's L1 owner moves to the delegation program the instant
      // it's created (same as Deal — see useDeals.ts / lib/ephemeralRollup.ts),
      // so L1 alone only ever shows its state as of initialize_milestone.
      const [l1Accounts, erAccounts] = await Promise.all([
        program.account.milestone.all(filters),
        erProgram.account.milestone.all(filters).catch(() => []),
      ]);
      const byPubkey = new Map(l1Accounts.map((a) => [a.publicKey.toBase58(), a]));
      for (const a of erAccounts) byPubkey.set(a.publicKey.toBase58(), a);
      setMilestones(Array.from(byPubkey.values()).map((a) => mapMilestone(a.publicKey, a.account)));
    } catch {
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, dealFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { milestones, loading, refresh };
}
