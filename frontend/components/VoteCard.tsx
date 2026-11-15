"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, CircleAlert, Lock, Vote as VoteIcon } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  permissionPdaFromAccount,
  PERMISSION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { votePda, privateVotingProgram, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";
import { sessionTokenPda, loadSession, isSessionValid, sessionKeypairFrom } from "@/lib/sessionKeys";
import { fetchRelaySponsorPubkey, fetchRelayBlockhash, submitViaRelay } from "@/lib/relayClient";
import { getAnonymousTeeConnection } from "@/lib/ephemeralRollup";
import { describeError, isLikelyNetworkMismatch } from "@/lib/errorHints";
import { Countdown } from "@/components/Countdown";
import { VoteConfirmModal } from "@/components/VoteConfirmModal";
import { SuccessFlash } from "@/components/SuccessFlash";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import { rememberSealed, hasSealed } from "@/lib/sealedLocal";
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
  // The `vote` PDA is an ER-only account with an `init` constraint — a
  // second cast_vote for the same (milestone, voter) fails on-chain with a
  // generic "invalid account data" instead of a clear error, since Anchor's
  // init rejects an already-existing account before any custom program
  // logic runs. An unsealed vote is visible to the anonymous read below; a
  // sealed one (init_vote_permission, which this card now always sends) is
  // hidden from it by design, so a per-browser record covers that case.
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setHasVoted(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const erConnection = await getAnonymousTeeConnection();
        const vote = votePda(new PublicKey(milestone.publicKey), publicKey);
        const info = await erConnection.getAccountInfo(vote);
        const votedHere = hasSealed("vote", milestone.publicKey, publicKey.toBase58());
        if (!cancelled) setHasVoted(info !== null || votedHere);
      } catch {
        // Fail open — worst case is the same unhelpful on-chain error the
        // user already gets today, not a regression.
        if (!cancelled) setHasVoted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey, milestone.publicKey]);

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

      // Seal the vote in the same relay-sponsored transaction: without
      // init_vote_permission, any TEE-authenticated reader could see the
      // choice before reveal. Permissionless — the Milestone PDA pays rent.
      tx.add(
        await program.methods
          .initVotePermission(new BN(milestone.milestoneId))
          .accountsPartial({
            milestone: milestonePk,
            vote,
            votePermission: permissionPdaFromAccount(vote),
            permissionProgram: PERMISSION_PROGRAM_ID,
            ephemeralVault: EPHEMERAL_VAULT_ID,
            magicProgram: MAGIC_PROGRAM_ID,
          })
          .instruction(),
      );

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
      rememberSealed("vote", milestone.publicKey, publicKey.toBase58());

      setStatus({ kind: "success" });
      setHasVoted(true);
      onVoted?.();
    } catch (err) {
      setStatus({ kind: "error", message: describeError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="avs-elevate relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <SuccessFlash trigger={status.kind === "success"} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="flex min-w-0 items-center gap-2.5 text-base font-medium text-card-foreground">
          <span className="avs-icon-badge h-8 w-8">
            <VoteIcon className="h-4 w-4 text-primary" strokeWidth={2} />
          </span>
          {t("voteCard.milestone", { id: milestone.milestoneId })}
        </h3>
        <span className="whitespace-nowrap text-sm">
          <Countdown deadlineTs={milestone.deadlineTs} />
        </span>
      </div>
      <p className="mt-3 font-mono-avs text-sm text-muted-foreground">
        {t("voteCard.rewardPool", { amount: formatTokenAmount(milestone.rewardPool, 9) })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("voteCard.sealedNotice", { count: milestone.voterCount })}
      </p>
      {milestone.status !== "open" ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" strokeWidth={2} />
          {t("voteCard.votingClosed")}
        </p>
      ) : milestone.deadlineTs * 1000 < Date.now() ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" strokeWidth={2} />
          {t("voteCard.awaitingReveal")}
        </p>
      ) : !publicKey ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("voteCard.connectToVote")}</p>
      ) : hasVoted ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
          {t("voteCard.alreadyVoted")}
        </p>
      ) : (
        <div className="mt-4 flex gap-2">
          <motion.button
            disabled={submitting}
            onClick={() => setPendingChoice("yes")}
            whileTap={!submitting ? { scale: 0.96 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 cursor-pointer rounded-md bg-green-600 px-4 min-h-11 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t("voteCard.submitting") : t("voteCard.voteYes")}
          </motion.button>
          <motion.button
            disabled={submitting}
            onClick={() => setPendingChoice("no")}
            whileTap={!submitting ? { scale: 0.96 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 cursor-pointer rounded-md bg-red-600 px-4 min-h-11 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div role="alert" className="mt-2 text-sm">
          <p className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={2} />
            {t("voteCard.error", { message: status.message ?? "" })}
          </p>
          {isLikelyNetworkMismatch(status.message ?? "") && (
            <p className="mt-1 pl-6 text-xs text-muted-foreground">{t("common.networkMismatchHint")}</p>
          )}
        </div>
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
