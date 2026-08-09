"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket, CircleAlert, Link2 } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getMint, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  deriveEphemeralAta,
  permissionPdaFromAccount,
  PERMISSION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import {
  dealPda,
  sealedAuctionProgram,
  EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
  DELEGATION_PROGRAM_ID,
} from "@/lib/programs";
import { getWalletErConnection, ER_VALIDATOR } from "@/lib/ephemeralRollup";
import { isLikelyNetworkMismatch } from "@/lib/errorHints";
import { useTranslation } from "@/lib/LanguageContext";

type Step = "idle" | "creating" | "delegating" | "permissioning" | "done";

export default function NewDealPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction, signMessage } = useWallet();
  const { t } = useTranslation();

  const [fundingMint, setFundingMint] = useState("");
  const [valuation, setValuation] = useState("");
  const [equityPercent, setEquityPercent] = useState("");
  const [minInvestment, setMinInvestment] = useState("");
  const [maxCap, setMaxCap] = useState("");
  const [deadline, setDeadline] = useState("");
  const [cliffMonths, setCliffMonths] = useState("0");
  const [vestingMonths, setVestingMonths] = useState("0");

  const [step, setStep] = useState<Step>("idle");
  const [status, setStatus] = useState<{ kind: "idle" | "error"; message?: string }>({ kind: "idle" });

  const busy = step !== "idle" && step !== "done";

  async function submit() {
    if (!publicKey || !wallet?.adapter || !sendTransaction) return;
    if (!signMessage) {
      setStatus({
        kind: "error",
        message: t("newDeal.noSignMessageSupport"),
      });
      return;
    }
    setStatus({ kind: "idle" });

    try {
      const fundingMintPk = new PublicKey(fundingMint.trim());
      const mintInfo = await getMint(connection, fundingMintPk);
      const scale = 10 ** mintInfo.decimals;

      const equityBps = Math.round(Number(equityPercent) * 100);
      const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
      const dealId = new BN(Date.now());
      const deal = dealPda(publicKey, BigInt(dealId.toString()));
      const dealFundingAccount = getAssociatedTokenAddressSync(fundingMintPk, deal, true);
      const [dealFundingEphemeralAta] = deriveEphemeralAta(deal, fundingMintPk);
      const eataBuffer = PublicKey.findProgramAddressSync(
        [Buffer.from("buffer"), dealFundingEphemeralAta.toBuffer()],
        EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
      )[0];
      const eataRecord = PublicKey.findProgramAddressSync(
        [Buffer.from("delegation"), dealFundingEphemeralAta.toBuffer()],
        DELEGATION_PROGRAM_ID,
      )[0];
      const eataMetadata = PublicKey.findProgramAddressSync(
        [Buffer.from("delegation-metadata"), dealFundingEphemeralAta.toBuffer()],
        DELEGATION_PROGRAM_ID,
      )[0];

      const program = sealedAuctionProgram(connection, wallet.adapter as never);

      setStep("creating");
      const initTx = await program.methods
        .initializeDeal(
          dealId,
          new BN(Math.round(Number(valuation) * scale)),
          equityBps,
          new BN(Math.round(Number(minInvestment) * scale)),
          new BN(Math.round(Number(maxCap) * scale)),
          new BN(deadlineTs),
          Number(cliffMonths),
          Number(vestingMonths),
          new BN(1_000_000), // sponsor_lamports — covers the deal's own ephemeral permission rent
        )
        .accountsPartial({
          startup: publicKey,
          fundingMint: fundingMintPk,
          deal,
          dealFundingAccount,
          dealFundingEphemeralAta,
          dealFundingEataBuffer: eataBuffer,
          dealFundingEataRecord: eataRecord,
          dealFundingEataMetadata: eataMetadata,
          ephemeralTokenProgram: EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
          delegationProgram: DELEGATION_PROGRAM_ID,
          validator: ER_VALIDATOR,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const initSig = await sendTransaction(initTx, connection);
      await connection.confirmTransaction(initSig, "confirmed");

      setStep("delegating");
      const delegateTx = await program.methods
        .delegateDeal(dealId)
        .accountsPartial({ startup: publicKey, deal, validator: ER_VALIDATOR })
        .transaction();
      const delegateSig = await sendTransaction(delegateTx, connection);
      await connection.confirmTransaction(delegateSig, "confirmed");

      // Give the delegation a moment to propagate before the ER will
      // recognize the account as ready — matches the pattern proven in
      // tests/sealed-auction.ts's live suite.
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setStep("permissioning");
      const erConnection = await getWalletErConnection(publicKey, signMessage);
      const erProgram = sealedAuctionProgram(erConnection, wallet.adapter as never);
      const permissionTx = await erProgram.methods
        .initDealPermission(dealId)
        .accountsPartial({
          startup: publicKey,
          deal,
          permission: permissionPdaFromAccount(deal),
          permissionProgram: PERMISSION_PROGRAM_ID,
          ephemeralVault: EPHEMERAL_VAULT_ID,
          magicProgram: MAGIC_PROGRAM_ID,
        })
        .transaction();
      const permissionSig = await sendTransaction(permissionTx, erConnection);
      await erConnection.confirmTransaction(permissionSig, "confirmed");

      setStep("done");
      router.push(`/deals/${deal.toBase58()}`);
    } catch (err) {
      setStep("idle");
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  function isValidPubkey(value: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new PublicKey(value.trim());
      return true;
    } catch {
      return false;
    }
  }

  const fieldErrors: Partial<Record<"fundingMint" | "equityPercent" | "maxCap" | "deadline", string>> = {};
  if (fundingMint.trim().length > 0 && !isValidPubkey(fundingMint)) {
    fieldErrors.fundingMint = t("newDeal.errorInvalidMint");
  }
  if (equityPercent !== "" && Number(equityPercent) > 100) {
    fieldErrors.equityPercent = t("newDeal.errorEquityTooHigh");
  }
  if (maxCap !== "" && minInvestment !== "" && Number(maxCap) < Number(minInvestment)) {
    fieldErrors.maxCap = t("newDeal.errorMaxBelowMin");
  }
  if (deadline.length > 0 && new Date(deadline).getTime() <= Date.now()) {
    fieldErrors.deadline = t("newDeal.errorDeadlinePast");
  }

  const valid =
    fundingMint.trim().length > 0 &&
    isValidPubkey(fundingMint) &&
    Number(valuation) > 0 &&
    Number(equityPercent) > 0 &&
    Number(equityPercent) <= 100 &&
    Number(minInvestment) > 0 &&
    Number(maxCap) >= Number(minInvestment) &&
    deadline.length > 0 &&
    new Date(deadline).getTime() > Date.now();

  if (!publicKey) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          {t("newDeal.connectPrompt")}
        </p>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mx-auto max-w-xl px-6 py-10"
    >
      <h1 className="flex items-center gap-2 font-heading text-2xl font-light tracking-tight text-foreground">
        <Rocket className="h-5 w-5 text-primary" strokeWidth={2} />
        {t("newDeal.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("newDeal.subtitle")}</p>

      <div className="mt-6 space-y-4 avs-elevate rounded-xl border border-border bg-card p-5">
        <Field label={t("newDeal.fundingMint")} error={fieldErrors.fundingMint}>
          <input
            value={fundingMint}
            onChange={(e) => setFundingMint(e.target.value)}
            placeholder={t("newDeal.fundingMintPlaceholder")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("newDeal.valuation")}>
            <input
              type="number"
              value={valuation}
              onChange={(e) => setValuation(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.equityPercent")} error={fieldErrors.equityPercent}>
            <input
              type="number"
              step="0.1"
              max={100}
              value={equityPercent}
              onChange={(e) => setEquityPercent(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.minInvestment")}>
            <input
              type="number"
              value={minInvestment}
              onChange={(e) => setMinInvestment(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.maxCap")} error={fieldErrors.maxCap}>
            <input
              type="number"
              value={maxCap}
              onChange={(e) => setMaxCap(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.cliffMonths")}>
            <input
              type="number"
              value={cliffMonths}
              onChange={(e) => setCliffMonths(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.vestingMonths")}>
            <input
              type="number"
              value={vestingMonths}
              onChange={(e) => setVestingMonths(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
        </div>

        <Field label={t("newDeal.deadline")} error={fieldErrors.deadline}>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </Field>

        <motion.button
          type="button"
          disabled={!valid || busy}
          onClick={() => void submit()}
          whileTap={valid && !busy ? { scale: 0.98 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-full cursor-pointer avs-glow-primary rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <StepLabel step={step} /> : t("newDeal.createDeal")}
        </motion.button>

        {step === "permissioning" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
            {t("newDeal.signMessageNotice")}
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
    </motion.main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

function StepLabel({ step }: { step: Step }) {
  const { t } = useTranslation();
  switch (step) {
    case "creating":
      return <>{t("newDeal.stepCreating")}</>;
    case "delegating":
      return <>{t("newDeal.stepDelegating")}</>;
    case "permissioning":
      return <>{t("newDeal.stepPermissioning")}</>;
    default:
      return <>{t("newDeal.stepWorking")}</>;
  }
}
