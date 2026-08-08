"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useMilestones } from "@/hooks/useMilestones";
import { VoteCard } from "@/components/VoteCard";

export default function VotePage() {
  const { publicKey } = useWallet();
  const { milestones, loading, refresh } = useMilestones();
  const open = milestones.filter((m) => m.status === "open");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Milestone Votes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sealed YES/NO votes — outcomes and rewards reveal simultaneously after each deadline.
          </p>
        </div>
      </div>

      {!publicKey && (
        <p className="mt-10 text-center text-neutral-500">
          Connect your wallet to see milestones you can vote on.
        </p>
      )}

      {publicKey && loading && (
        <p className="mt-10 text-center text-neutral-500">Loading milestones…</p>
      )}

      {publicKey && !loading && open.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">No open milestones right now.</p>
      )}

      {publicKey && (
        <div className="mt-6 space-y-4">
          {open.map((m) => (
            <VoteCard key={m.publicKey} milestone={m} onVoted={() => void refresh()} />
          ))}
        </div>
      )}
    </main>
  );
}
