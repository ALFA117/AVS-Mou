"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { votePda, privateVotingProgram, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";
import { sessionTokenPda, loadSession, isSessionValid, sessionKeypairFrom } from "@/lib/sessionKeys";
import { Countdown } from "@/components/Countdown";
import { VoteConfirmModal } from "@/components/VoteConfirmModal";
import { formatTokenAmount } from "@/lib/format";
import type { Choice, Milestone } from "@/lib/types";

const MAGIC_VAULT = new PublicKey("MagicVau1t999999999999999999999999999999999");
const MAGIC_PROGRAM = new PublicKey("Magic11111111111111111111111111111111111111");

export function VoteCard({ milestone, onVoted }: { milestone: Milestone; onVoted?: () => void }) {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction } = useWallet();
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  async function submitVote(choice: Choice) {
    if (!publicKey || !wallet?.adapter) return;
    setPendingChoice(null);
    setStatus({ kind: "idle" });

    try {
      const milestonePk = new PublicKey(milestone.publicKey);
      const session = loadSession(PRIVATE_VOTING_PROGRAM_ID, publicKey);
      const useSession = isSessionValid(session);
      const sessionSigner = useSession && session ? sessionKeypairFrom(session) : null;
      const voterPubkey = sessionSigner?.publicKey ?? publicKey;

      const program = privateVotingProgram(connection, wallet.adapter as never);
      const vote = votePda(milestonePk, publicKey);
      const sessionToken = sessionSigner
        ? sessionTokenPda(PRIVATE_VOTING_PROGRAM_ID, sessionSigner.publicKey, publicKey)
        : null;

      const choiceArg = choice === "yes" ? { yes: {} } : { no: {} };
      const tx = await program.methods
        .castVote(new BN(milestone.milestoneId), publicKey, choiceArg)
        // accountsPartial: see BidForm.tsx for why (session_token carries
        // PDA seed metadata, excluded from the strict `.accounts()` type).
        .accountsPartial({
          // NOTE: same sponsor-pattern caveat as sealed-auction's
          // PlaceBid — `payer` must equal the milestone's startup. See
          // programs/private-voting/src/lib.rs's PlaceBid-mirrored doc
          // comment on CastVote.
          payer: publicKey,
          voter: voterPubkey,
          sessionToken,
          milestone: milestonePk,
          vote,
          vault: MAGIC_VAULT,
          magicProgram: MAGIC_PROGRAM,
        })
        .transaction();

      const sig = await sendTransaction(
        tx,
        connection,
        sessionSigner ? { signers: [sessionSigner] } : undefined,
      );
      await connection.confirmTransaction(sig, "confirmed");

      setStatus({ kind: "success" });
      onVoted?.();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Milestone #{milestone.milestoneId}</h3>
        <Countdown deadlineTs={milestone.deadlineTs} />
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Reward pool: {formatTokenAmount(milestone.rewardPool, 9)} SOL
      </p>
      <p className="mt-1 text-xs text-neutral-400">
        Your vote is private until reveal — {milestone.voterCount} sealed votes so far.
      </p>
      {!publicKey ? (
        <p className="mt-4 text-sm text-neutral-500">Connect your wallet to vote.</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setPendingChoice("yes")}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Vote YES
          </button>
          <button
            onClick={() => setPendingChoice("no")}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Vote NO
          </button>
        </div>
      )}
      {status.kind === "success" && (
        <p className="mt-2 text-sm text-green-700">Vote cast. Waiting for reveal.</p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 text-sm text-red-600">Vote failed: {status.message}</p>
      )}

      {pendingChoice && (
        <VoteConfirmModal
          choice={pendingChoice}
          onCancel={() => setPendingChoice(null)}
          onConfirm={() => void submitVote(pendingChoice)}
        />
      )}
    </div>
  );
}
