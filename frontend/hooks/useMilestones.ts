"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { privateVotingProgram } from "@/lib/programs";
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
      const program = privateVotingProgram(
        connection,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet?.adapter as any) ?? READONLY_WALLET,
      );
      const filters = dealFilter
        ? [{ memcmp: { offset: 8 + 32, bytes: dealFilter } }] // startup(32) precedes deal
        : [];
      const accounts = await program.account.milestone.all(filters);
      setMilestones(accounts.map((a) => mapMilestone(a.publicKey, a.account)));
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
