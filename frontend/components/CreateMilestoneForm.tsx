"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CircleAlert, Link2, Plus } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  permissionPdaFromAccount,
  PERMISSION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { privateVotingProgram, milestonePda } from "@/lib/programs";
import { getWalletErConnection, ER_VALIDATOR } from "@/lib/ephemeralRollup";
import { isLikelyNetworkMismatch } from "@/lib/errorHints";
import { useTranslation } from "@/lib/LanguageContext";

async function sha256Bytes(text: string): Promise<number[]> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest));
}

type Step = "idle" | "creating" | "permissioning" | "done";

/**
 * No frontend page anywhere lets a startup create a milestone —
 * initialize_milestone had zero UI usage before this (see
 * docs/KNOWN_ISSUES.md-style gap noted this session: the same was true of
 * reveal_deal/settle_bid until RevealSettlePanel). Mirrors
 * app/deals/new/page.tsx's three-step pattern: initialize + delegate on
 * L1, then init_milestone_permission on the ER via the startup's own
 * wallet (no relay needed — same reasoning as RevealSettlePanel, this
 * doesn't create any per-vote rent-bearing account).
 */
export function CreateMilestoneForm({ deal, onCreated }: { deal: string; onCreated?: () => void }) {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction, signMessage } = useWallet();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [rewardPool, setRewardPool] = useState("0");
  const [step, setStep] = useState<Step>("idle");
  const [status, setStatus] = useState<{ kind: "idle" | "error"; message?: string }>({ kind: "idle" });

  const busy = step !== "idle" && step !== "done";
  const valid = description.trim().length > 0 && deadline.length > 0 && Number(rewardPool) >= 0;

  async function submit() {
    if (!publicKey || !wallet?.adapter || !sendTransaction || !signMessage) return;
    setStatus({ kind: "idle" });

    try {
      const dealPk = new PublicKey(deal);
      const descriptionHash = await sha256Bytes(description.trim());
      const deadlineTs = new BN(Math.floor(new Date(deadline).getTime() / 1000));
      const rewardLamports = new BN(Math.round(Number(rewardPool) * LAMPORTS_PER_SOL));
      const milestoneId = new BN(Date.now());
      const milestone = milestonePda(publicKey, BigInt(milestoneId.toString()));

      const program = privateVotingProgram(connection, wallet.adapter as never);

      // Bundled into one signature — see app/deals/new/page.tsx's identical
      // initialize+delegate combination for why this is safe (delegate only
      // needs the derived milestone address, not confirmed on-chain data).
      setStep("creating");
      const initIx = await program.methods
        .initializeMilestone(milestoneId, dealPk, descriptionHash, deadlineTs, rewardLamports, new BN(1_000_000))
        .accountsPartial({ startup: publicKey, milestone, systemProgram: SystemProgram.programId })
        .instruction();
      const delegateIx = await program.methods
        .delegateMilestone(milestoneId)
        .accountsPartial({ startup: publicKey, milestone, validator: ER_VALIDATOR })
        .instruction();
      const initAndDelegateTx = new Transaction().add(initIx, delegateIx);
      const initSig = await sendTransaction(initAndDelegateTx, connection);
      await connection.confirmTransaction(initSig, "confirmed");

      // Same propagation wait app/deals/new/page.tsx uses before the ER
      // will recognize the account as ready.
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setStep("permissioning");
      const erConnection = await getWalletErConnection(publicKey, signMessage);
      const erProgram = privateVotingProgram(erConnection, wallet.adapter as never);
      const permissionTx = await erProgram.methods
        .initMilestonePermission(milestoneId)
        .accountsPartial({
          startup: publicKey,
          milestone,
          permission: permissionPdaFromAccount(milestone),
          permissionProgram: PERMISSION_PROGRAM_ID,
          ephemeralVault: EPHEMERAL_VAULT_ID,
          magicProgram: MAGIC_PROGRAM_ID,
        })
        .transaction();
      const permissionSig = await sendTransaction(permissionTx, erConnection);
      await erConnection.confirmTransaction(permissionSig, "confirmed");

      setStep("done");
      setOpen(false);
      setDescription("");
      setDeadline("");
      setRewardPool("0");
      onCreated?.();
    } catch (err) {
      setStep("idle");
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        {t("createMilestone.openButton")}
      </button>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="avs-elevate rounded-xl border border-border bg-card p-4"
    >
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{t("createMilestone.description")}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t("createMilestone.descriptionPlaceholder")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{t("createMilestone.deadline")}</span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{t("createMilestone.rewardPool")}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rewardPool}
              onChange={(e) => setRewardPool(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            disabled={!valid || busy}
            onClick={() => void submit()}
            whileTap={valid && !busy ? { scale: 0.98 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="cursor-pointer whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <StepLabel step={step} /> : t("createMilestone.createButton")}
          </motion.button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen(false)}
            className="cursor-pointer text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("common.cancel")}
          </button>
        </div>

        {step === "permissioning" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
            {t("createMilestone.signMessageNotice")}
          </p>
        )}
        {status.kind === "error" && (
          <div role="alert" className="text-sm">
            <p className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={2} />
              {status.message}
            </p>
            {isLikelyNetworkMismatch(status.message ?? "") && (
              <p className="mt-1 pl-6 text-xs text-muted-foreground">{t("common.networkMismatchHint")}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StepLabel({ step }: { step: Step }) {
  const { t } = useTranslation();
  switch (step) {
    case "creating":
      return <>{t("createMilestone.stepCreating")}</>;
    case "permissioning":
      return <>{t("createMilestone.stepPermissioning")}</>;
    default:
      return <>{t("createMilestone.stepWorking")}</>;
  }
}
