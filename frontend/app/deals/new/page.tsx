"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket, CircleAlert, Link2, Wallet } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
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
import { describeError, isLikelyNetworkMismatch } from "@/lib/errorHints";
import { EmptyState } from "@/components/EmptyState";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useTranslation } from "@/lib/LanguageContext";

type Step = "idle" | "creating" | "permissioning" | "done";

// Creating a deal funds rent for ~6 new accounts (deal, funding ATA,
// ephemeral ATA + buffer + record + metadata) plus the 0.001 SOL
// sponsor_lamports and tx fees. 0.05 SOL is a comfortable margin above
// that — low enough that a real attempt won't false-positive, high
// enough to catch the "forgot to fund the devnet wallet" case before it
// becomes a confusing WalletSendTransactionError with no useful detail.
const LOW_BALANCE_THRESHOLD_SOL = 0.05;

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
  const [solBalance, setSolBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setSolBalance(null);
      return;
    }
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setSolBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (!cancelled) setSolBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);
  // `busy` (derived from `step`) only becomes true once setStep("creating")
  // runs below — but that's after an await (getMint), so a second click
  // during that gap isn't caught by the disabled prop's next render and
  // fires a second full submit(), popping a second wallet confirmation for
  // the same deal. A ref is checked synchronously, before React re-renders,
  // so it closes that window.
  const submittingRef = useRef(false);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
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

      // initialize_deal and delegate_deal both sign as the startup on the
      // same L1 connection with no dependency on the first being confirmed
      // before building the second (delegate_deal only needs `deal`'s
      // derived address, not its on-chain data) — bundling them into one
      // transaction cuts a wallet round-trip and means the deal can never
      // end up created-but-undelegated if the flow is interrupted between
      // the two.
      setStep("creating");
      const initIx = await program.methods
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
        .instruction();
      const delegateIx = await program.methods
        .delegateDeal(dealId)
        .accountsPartial({ startup: publicKey, deal, validator: ER_VALIDATOR })
        .instruction();
      // Anchor's own .transaction() builder used to set feePayer for us —
      // building from raw .instruction()s to combine two into one signature
      // doesn't, so set both explicitly rather than relying on
      // wallet-adapter's own fallback (it does have one, but don't depend
      // on undocumented behavior for something this easy to just set).
      const initAndDelegateTx = new Transaction().add(initIx, delegateIx);
      initAndDelegateTx.feePayer = publicKey;
      initAndDelegateTx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      const initSig = await sendTransaction(initAndDelegateTx, connection);
      await connection.confirmTransaction(initSig, "confirmed");

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
      setStatus({ kind: "error", message: describeError(err) });
    } finally {
      submittingRef.current = false;
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

  function isNonNegativeInteger(value: string): boolean {
    return value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;
  }

  const fieldErrors: Partial<
    Record<"fundingMint" | "equityPercent" | "maxCap" | "deadline" | "cliffMonths" | "vestingMonths", string>
  > = {};
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
  if (cliffMonths !== "" && !isNonNegativeInteger(cliffMonths)) {
    fieldErrors.cliffMonths = t("newDeal.errorMustBeWholeMonths");
  }
  if (vestingMonths !== "" && !isNonNegativeInteger(vestingMonths)) {
    fieldErrors.vestingMonths = t("newDeal.errorMustBeWholeMonths");
  }

  const valid =
    fundingMint.trim().length > 0 &&
    isValidPubkey(fundingMint) &&
    Number(valuation) > 0 &&
    Number(equityPercent) > 0 &&
    Number(equityPercent) <= 100 &&
    Number(minInvestment) > 0 &&
    Number(maxCap) >= Number(minInvestment) &&
    isNonNegativeInteger(cliffMonths) &&
    isNonNegativeInteger(vestingMonths) &&
    deadline.length > 0 &&
    new Date(deadline).getTime() > Date.now();

  if (!publicKey) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <EmptyState
          icon={Wallet}
          title={t("newDeal.connectTitle")}
          description={t("newDeal.connectPrompt")}
          action={<WalletConnectButton />}
        />
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

      {solBalance !== null && solBalance < LOW_BALANCE_THRESHOLD_SOL && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p>
            {t("newDeal.lowBalanceWarning", { balance: solBalance.toFixed(4) })}{" "}
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              {t("newDeal.lowBalanceFaucetLink")}
            </a>
          </p>
        </div>
      )}

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
              min={0}
              step="0.01"
              value={valuation}
              onChange={(e) => setValuation(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.equityPercent")} error={fieldErrors.equityPercent}>
            <input
              type="number"
              min={0}
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
              min={0}
              step="0.01"
              value={minInvestment}
              onChange={(e) => setMinInvestment(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.maxCap")} error={fieldErrors.maxCap}>
            <input
              type="number"
              min={0}
              step="0.01"
              value={maxCap}
              onChange={(e) => setMaxCap(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.cliffMonths")} error={fieldErrors.cliffMonths}>
            <input
              type="number"
              min={0}
              step="1"
              value={cliffMonths}
              onChange={(e) => setCliffMonths(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </Field>
          <Field label={t("newDeal.vestingMonths")} error={fieldErrors.vestingMonths}>
            <input
              type="number"
              min={0}
              step="1"
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
    case "permissioning":
      return <>{t("newDeal.stepPermissioning")}</>;
    default:
      return <>{t("newDeal.stepWorking")}</>;
  }
}
