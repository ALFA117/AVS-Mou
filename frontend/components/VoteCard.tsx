"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, CircleAlert, Vote as VoteIcon } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { votePda, privateVotingProgram, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";
import { sessionTokenPda, loadSession, isSessionValid, sessionKeypairFrom } from "@/lib/sessionKeys";
import { fetchRelaySponsorPubkey, fetchRelayBlockhash, submitViaRelay } from "@/lib/relayClient";
import { Countdown } from "@/components/Countdown";
import { VoteConfirmModal } from "@/components/VoteConfirmModal";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { Choice, Milestone } from "@/lib/types";

const MAGIC_VAULT = new PublicKey("MagicVau1t999999999999999999999999999999999");
const MAGIC_PROGRAM = new PublicKey("Magic11111111111111111111111111111111111111");

export function VoteCard({ milestone, onVoted }: { milestone: Milestone; onVoted?: () => void }) {
  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction } = useWallet();
  const { t } = useTranslation();
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  async function submitVote(choice: Choice) {
    if (!publicKey || !wallet?.adapter) return;
    setPendingChoice(null);
    setSubmitting(true);
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
      const sponsorPubkey = new PublicKey(await fetchRelaySponsorPubkey());

      let tx = await program.methods
        .castVote(new BN(milestone.milestoneId), publicKey, choiceArg)
        // accountsPartial: see BidForm.tsx for why (session_token carries
        // PDA seed metadata, excluded from the strict `.accounts()` type).
        .accountsPartial({
          // The relay's sponsor keypair pays vote-account rent and the tx
          // fee — see docs/RELAY.md and app/api/relay/.
          payer: sponsorPubkey,
          voter: voterPubkey,
          sessionToken,
          milestone: milestonePk,
          vote,
          vault: MAGIC_VAULT,
          magicProgram: MAGIC_PROGRAM,
        })
        .transaction();

      tx.feePayer = sponsorPubkey;
      // cast_vote runs on MagicBlock's Private Ephemeral Rollup (vote is an
      // ER-only account) — the blockhash must be valid there, not on L1.
      // See docs/RELAY.md and docs/KNOWN_ISSUES.md.
      tx.recentBlockhash = await fetchRelayBlockhash();

      if (sessionSigner) {
        tx.partialSign(sessionSigner);
      } else {
        if (!signTransaction) throw new Error("Wallet does not support transaction signing");
        tx = await signTransaction(tx);
      }

      // The relay confirms server-side (it holds the only TEE auth on our
      // side) before returning, so no client-side confirmTransaction here.
      await submitViaRelay(tx);

      setStatus({ kind: "success" });
      onVoted?.();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="avs-elevate rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 font-heading font-semibold text-card-foreground">
          <span className="avs-icon-badge h-8 w-8">
            <VoteIcon className="h-4 w-4 text-primary" strokeWidth={2} />
          </span>
          {t("voteCard.milestone", { id: milestone.milestoneId })}
        </h3>
        <Countdown deadlineTs={milestone.deadlineTs} />
      </div>
      <p className="mt-2 font-mono-avs text-sm text-muted-foreground">
        {t("voteCard.rewardPool", { amount: formatTokenAmount(milestone.rewardPool, 9) })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("voteCard.sealedNotice", { count: milestone.voterCount })}
      </p>
      {!publicKey ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("voteCard.connectToVote")}</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <motion.button
            disabled={submitting}
            onClick={() => setPendingChoice("yes")}
            whileTap={!submitting ? { scale: 0.96 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t("voteCard.submitting") : t("voteCard.voteYes")}
          </motion.button>
          <motion.button
            disabled={submitting}
            onClick={() => setPendingChoice("no")}
            whileTap={!submitting ? { scale: 0.96 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t("voteCard.submitting") : t("voteCard.voteNo")}
          </motion.button>
        </div>
      )}
      {status.kind === "success" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <CircleCheck className="h-4 w-4" strokeWidth={2} />
          {t("voteCard.success")}
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <CircleAlert className="h-4 w-4" strokeWidth={2} />
          {t("voteCard.error", { message: status.message ?? "" })}
        </p>
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
