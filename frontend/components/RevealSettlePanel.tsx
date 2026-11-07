"use client";

import { useState } from "react";
import { CircleCheck, CircleAlert, Unlock } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  permissionPdaFromAccount,
  PERMISSION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { sealedAuctionProgram } from "@/lib/programs";
import { getWalletErConnection } from "@/lib/ephemeralRollup";
import { isFundingAccountDelegated, delegateFundingAccount } from "@/lib/ephemeralDelegation";
import { describeError, isLikelyNetworkMismatch } from "@/lib/errorHints";
import { useSolBalance } from "@/hooks/useSolBalance";
import { SuccessFlash } from "@/components/SuccessFlash";
import { LowBalanceWarning } from "@/components/LowBalanceWarning";
import { formatTokenAmount, shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import { mapBid } from "@/lib/mappers";
import type { Bid, Deal } from "@/lib/types";

/**
 * reveal_deal and settle_bid have no frontend trigger anywhere else in the
 * app — a deal that reaches its deadline has no way to progress without a
 * raw script (see docs/KNOWN_ISSUES.md and the seeding scripts used to
 * demo this session). Both instructions run on the ER and are cheap
 * (no new rent), so the startup's own wallet pays directly — no relay
 * needed, unlike place_bid/cast_vote.
 */
export function RevealSettlePanel({
  deal,
  bids,
  onChanged,
}: {
  deal: Deal;
  bids: Bid[];
  onChanged?: () => void;
}) {
  const { connection } = useConnection();
  const { publicKey, wallet, signMessage, sendTransaction } = useWallet();
  const { t } = useTranslation();
  const solBalance = useSolBalance(publicKey, connection);
  const [busy, setBusy] = useState<string | null>(null); // "reveal" | bid pubkey | null
  const [delegating, setDelegating] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });
  // Sealed bids (init_bid_permission) are readable only by the bidder and
  // the startup, so the page's anonymous `bids` prop can't see them. The
  // startup re-reads them through its own authenticated TEE connection.
  const [startupBids, setStartupBids] = useState<Bid[] | null>(null);

  const isStartup = publicKey?.toBase58() === deal.startup;
  const pastDeadline = deal.deadlineTs * 1000 < Date.now();

  if (!isStartup) return null;
  if (deal.status === "open" && !pastDeadline) return null;
  if (deal.status === "settled") return null;

  async function erProgram() {
    if (!publicKey || !wallet?.adapter || !signMessage) {
      throw new Error(t("revealSettle.needsSignMessage"));
    }
    const erConnection = await getWalletErConnection(publicKey, signMessage);
    return sealedAuctionProgram(erConnection, wallet.adapter as never);
  }

  async function loadSealedBids(program: Awaited<ReturnType<typeof erProgram>>): Promise<Bid[]> {
    const accounts = await program.account.bid.all([
      { memcmp: { offset: 8, bytes: deal.publicKey } }, // Bid.deal is the first field
    ]);
    const byKey = new Map(bids.map((b) => [b.publicKey, b]));
    for (const a of accounts) {
      const mapped = mapBid(a.publicKey, a.account as unknown as Record<string, unknown>);
      byKey.set(mapped.publicKey, mapped);
    }
    const all = Array.from(byKey.values());
    setStartupBids(all);
    return all;
  }

  async function loadBidsAsStartup() {
    setBusy("load");
    setStatus({ kind: "idle" });
    try {
      await loadSealedBids(await erProgram());
    } catch (err) {
      setStatus({ kind: "error", message: describeError(err) });
    } finally {
      setBusy(null);
    }
  }

  async function reveal() {
    setBusy("reveal");
    setStatus({ kind: "idle" });
    try {
      const program = await erProgram();
      const dealPk = new PublicKey(deal.publicKey);
      // reveal_deal needs every bid as a remaining account (it checks the
      // count against bid_count) — read them as the startup, a member of
      // each sealed bid's permission.
      const allBids = await loadSealedBids(program);
      await program.methods
        .revealDeal(new BN(deal.dealId))
        .accountsPartial({ startup: publicKey!, deal: dealPk })
        .remainingAccounts(
          allBids.map((b) => ({ pubkey: new PublicKey(b.publicKey), isSigner: false, isWritable: false })),
        )
        .rpc();
      setStatus({ kind: "success", message: t("revealSettle.revealSuccess") });
      onChanged?.();
    } catch (err) {
      setStatus({ kind: "error", message: describeError(err) });
    } finally {
      setBusy(null);
    }
  }

  async function settle(bid: Bid) {
    setBusy(bid.publicKey);
    setStatus({ kind: "idle" });
    try {
      if (!publicKey || !sendTransaction) throw new Error(t("revealSettle.needsSignMessage"));
      const fundingMint = new PublicKey(deal.fundingMint);
      const startupFundingAccount = getAssociatedTokenAddressSync(fundingMint, publicKey);

      // settle_bid's CPI writes into startup_funding_account within the
      // ER's execution context — like a bidder's own account before
      // place_bid, it has to be delegated there first (see
      // lib/ephemeralDelegation.ts). One-time per (startup, funding mint).
      const alreadyDelegated = await isFundingAccountDelegated(connection, startupFundingAccount);
      if (!alreadyDelegated) {
        setDelegating(true);
        await delegateFundingAccount({
          connection,
          owner: publicKey,
          mint: fundingMint,
          amount: BigInt(0),
          sendTransaction: (tx) => sendTransaction(tx, connection),
        });
        setDelegating(false);
      }

      const program = await erProgram();
      const dealPk = new PublicKey(deal.publicKey);
      const bidPk = new PublicKey(bid.publicKey);
      await program.methods
        .settleBid()
        .accountsPartial({
          bidder: new PublicKey(bid.bidder),
          deal: dealPk,
          bid: bidPk,
          fundingMint,
          dealFundingAccount: getAssociatedTokenAddressSync(fundingMint, dealPk, true),
          startupFundingAccount,
          bidPermission: permissionPdaFromAccount(bidPk),
          permissionProgram: PERMISSION_PROGRAM_ID,
          magicProgram: MAGIC_PROGRAM_ID,
          vault: EPHEMERAL_VAULT_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      setStatus({ kind: "success", message: t("revealSettle.settleSuccess") });
      setStartupBids((prev) => (prev ? prev.filter((b) => b.publicKey !== bid.publicKey) : prev));
      onChanged?.();
    } catch (err) {
      setStatus({ kind: "error", message: describeError(err) });
    } finally {
      setBusy(null);
    }
  }

  const visibleBids = startupBids ?? bids;
  const outstanding = Math.max(deal.bidCount - deal.closedBidCount, 0);

  return (
    <div className="avs-elevate relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <SuccessFlash trigger={status.kind === "success"} />
      <h3 className="flex items-center gap-2 font-heading font-light tracking-tight text-card-foreground">
        <span className="avs-icon-badge h-8 w-8">
          <Unlock className="h-4 w-4 text-primary" strokeWidth={2} />
        </span>
        {t("revealSettle.title")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("revealSettle.subtitle")}</p>
      <LowBalanceWarning solBalance={solBalance} />

      {deal.status === "open" && pastDeadline && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void reveal()}
          className="mt-4 cursor-pointer whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "reveal" ? t("revealSettle.revealing") : t("revealSettle.revealButton")}
        </button>
      )}

      {deal.status === "revealed" && (
        <div className="mt-4 space-y-2">
          {visibleBids.length === 0 && outstanding > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("revealSettle.sealedHint", { count: outstanding })}</p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void loadBidsAsStartup()}
                className="flex min-h-11 cursor-pointer items-center rounded-full border border-primary px-4 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary-subdued disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "load" ? t("common.loading") : t("revealSettle.loadBids")}
              </button>
            </div>
          ) : visibleBids.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("revealSettle.allSettled")}</p>
          ) : (
            visibleBids.map((b) => (
              <div
                key={b.publicKey}
                className="flex items-center justify-between gap-2 rounded-md bg-muted p-3 text-sm"
              >
                <span className="font-mono-avs text-xs text-muted-foreground">{shortenAddress(b.bidder)}</span>
                <span className="font-mono-avs font-medium text-foreground">{formatTokenAmount(b.amount)}</span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void settle(b)}
                  className="flex min-h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border border-primary px-3 text-xs font-medium text-primary transition-colors duration-200 hover:bg-primary-subdued disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === b.publicKey
                    ? delegating
                      ? t("revealSettle.delegating")
                      : t("revealSettle.settling")
                    : t("revealSettle.settleButton")}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {status.kind === "success" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
          {status.message}
        </p>
      )}
      {status.kind === "error" && (
        <div role="alert" className="mt-3 text-sm">
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
  );
}
