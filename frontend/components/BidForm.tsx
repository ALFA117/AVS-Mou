"use client";

import { useState } from "react";
import { Lock, CircleCheck, CircleAlert, Link2 } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  bidPda,
  sealedAuctionProgram,
  SEALED_AUCTION_PROGRAM_ID,
} from "@/lib/programs";
import { sessionTokenPda, loadSession, isSessionValid, sessionKeypairFrom } from "@/lib/sessionKeys";
import { fetchRelaySponsorPubkey, fetchRelayBlockhash, submitViaRelay } from "@/lib/relayClient";
import { isFundingAccountDelegated, delegateFundingAccount } from "@/lib/ephemeralDelegation";
import { formatTokenAmount } from "@/lib/format";
import { BidConfirmModal } from "@/components/BidConfirmModal";
import type { Deal } from "@/lib/types";

const MAGIC_VAULT = new PublicKey("MagicVau1t999999999999999999999999999999999");
const MAGIC_PROGRAM = new PublicKey("Magic11111111111111111111111111111111111111");

export function BidForm({ deal, onBidPlaced }: { deal: Deal; onBidPlaced?: () => void }) {
  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction, sendTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  const minInvestment = formatTokenAmount(deal.minInvestment);
  const parsedAmount = Number(amount);
  const amountValid = parsedAmount > 0 && parsedAmount >= Number(minInvestment);

  async function submitBid() {
    if (!publicKey || !wallet?.adapter) return;
    setConfirming(false);
    setStatus({ kind: "idle" });

    try {
      const dealPk = new PublicKey(deal.publicKey);
      const fundingMint = new PublicKey(deal.fundingMint);
      const session = loadSession(SEALED_AUCTION_PROGRAM_ID, publicKey);
      const useSession = isSessionValid(session);
      const sessionSigner = useSession && session ? sessionKeypairFrom(session) : null;
      const bidderPubkey = sessionSigner?.publicKey ?? publicKey;

      const bidderFundingAccount = getAssociatedTokenAddressSync(fundingMint, publicKey);

      // place_bid runs on MagicBlock's Private Ephemeral Rollup (bid is an
      // ER-only account) and the SPL transfer inside it reads the ER's copy
      // of bidderFundingAccount, not L1's — that copy only exists once this
      // investor has delegated their funding account there. One-time per
      // (investor, funding mint), paid by the investor's own wallet since
      // it isn't part of any single bid — see docs/RELAY.md.
      const alreadyDelegated = await isFundingAccountDelegated(connection, bidderFundingAccount);
      if (!alreadyDelegated) {
        if (!sendTransaction) throw new Error("Wallet does not support sending transactions");
        setDelegating(true);
        await delegateFundingAccount({
          connection,
          owner: publicKey,
          mint: fundingMint,
          amount: BigInt(Math.round(parsedAmount * 10 ** 6)),
          sendTransaction: (tx) => sendTransaction(tx, connection),
        });
        setDelegating(false);
      }

      const program = sealedAuctionProgram(connection, wallet.adapter as never);
      const bid = bidPda(dealPk, publicKey); // keyed by the investor, not whoever signs
      const dealFundingAccount = getAssociatedTokenAddressSync(fundingMint, dealPk, true);
      const sessionToken = sessionSigner
        ? sessionTokenPda(SEALED_AUCTION_PROGRAM_ID, sessionSigner.publicKey, publicKey)
        : null;
      const amountLamports = new BN(Math.round(parsedAmount * 10 ** 6));
      const sponsorPubkey = new PublicKey(await fetchRelaySponsorPubkey());

      let tx = await program.methods
        .placeBid(new BN(deal.dealId), publicKey, amountLamports)
        // accountsPartial (not accounts): `session_token`, `bid`, etc. carry
        // PDA seed metadata in the IDL, so Anchor's strict `.accounts()`
        // type excludes them as "auto-resolved" — but session_token is
        // optional and we need to explicitly control Some/None.
        .accountsPartial({
          // The relay's sponsor keypair pays bid-account rent (a few
          // thousand lamports) and the tx fee, so investors never need
          // their own SOL — see docs/RELAY.md and app/api/relay/.
          payer: sponsorPubkey,
          bidder: bidderPubkey,
          sessionToken,
          fundingMint,
          deal: dealPk,
          bid,
          bidderFundingAccount,
          dealFundingAccount,
          vault: MAGIC_VAULT,
          magicProgram: MAGIC_PROGRAM,
        })
        .transaction();

      tx.feePayer = sponsorPubkey;
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
      setAmount("");
      onBidPlaced?.();
    } catch (err) {
      setDelegating(false);
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  if (deal.status !== "open") {
    return (
      <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        Bidding is closed for this deal.
      </p>
    );
  }

  if (!publicKey) {
    return (
      <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        Connect your wallet to place a sealed bid.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-heading font-semibold text-card-foreground">
        <Lock className="h-4 w-4 text-primary" strokeWidth={2} />
        Place a sealed bid
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your amount is hidden from everyone — including other bidders — until reveal.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={minInvestment}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Min ${minInvestment}`}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          disabled={!amountValid}
          onClick={() => setConfirming(true)}
          className="cursor-pointer whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Place Bid
        </button>
      </div>
      {delegating && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link2 className="h-4 w-4 animate-pulse" strokeWidth={2} />
          One-time setup: approving your wallet for gasless bidding…
        </p>
      )}
      {status.kind === "success" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <CircleCheck className="h-4 w-4" strokeWidth={2} />
          Bid placed. Waiting for reveal.
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <CircleAlert className="h-4 w-4" strokeWidth={2} />
          Bid failed: {status.message}
        </p>
      )}

      {confirming && (
        <BidConfirmModal
          amount={amount}
          equityBps={deal.equityBps}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void submitBid()}
        />
      )}
    </div>
  );
}
