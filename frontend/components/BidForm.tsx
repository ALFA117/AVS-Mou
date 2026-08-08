"use client";

import { useState } from "react";
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
import { formatTokenAmount } from "@/lib/format";
import { BidConfirmModal } from "@/components/BidConfirmModal";
import type { Deal } from "@/lib/types";

const MAGIC_VAULT = new PublicKey("MagicVau1t999999999999999999999999999999999");
const MAGIC_PROGRAM = new PublicKey("Magic11111111111111111111111111111111111111");

export function BidForm({ deal, onBidPlaced }: { deal: Deal; onBidPlaced?: () => void }) {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  const minInvestment = formatTokenAmount(deal.minInvestment);
  const parsedAmount = Number(amount);
  const amountValid = parsedAmount > 0 && parsedAmount >= Number(minInvestment);
  const isStartup = publicKey?.toBase58() === deal.startup;

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

      const program = sealedAuctionProgram(connection, wallet.adapter as never);
      const bid = bidPda(dealPk, publicKey); // keyed by the investor, not whoever signs
      const bidderFundingAccount = getAssociatedTokenAddressSync(fundingMint, publicKey);
      const dealFundingAccount = getAssociatedTokenAddressSync(fundingMint, dealPk, true);
      const sessionToken = sessionSigner
        ? sessionTokenPda(SEALED_AUCTION_PROGRAM_ID, sessionSigner.publicKey, publicKey)
        : null;
      const amountLamports = new BN(Math.round(parsedAmount * 10 ** 6));

      const tx = await program.methods
        .placeBid(new BN(deal.dealId), publicKey, amountLamports)
        // accountsPartial (not accounts): `session_token`, `bid`, etc. carry
        // PDA seed metadata in the IDL, so Anchor's strict `.accounts()`
        // type excludes them as "auto-resolved" — but session_token is
        // optional and we need to explicitly control Some/None.
        .accountsPartial({
          // NOTE: sealed-auction's PlaceBid requires `payer` to equal the
          // deal's startup (the rent-sponsor pattern — see
          // programs/sealed-auction/src/lib.rs's doc comment on PlaceBid).
          // With no relay backend built yet, this only succeeds on-chain
          // when the connected wallet IS the deal's startup. Real investor
          // bids need a relay service that co-signs as the startup —
          // tracked as follow-up work, not implemented in this pass.
          payer: publicKey,
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

      const sig = await sendTransaction(
        tx,
        connection,
        sessionSigner ? { signers: [sessionSigner] } : undefined,
      );
      await connection.confirmTransaction(sig, "confirmed");

      setStatus({ kind: "success" });
      setAmount("");
      onBidPlaced?.();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  if (deal.status !== "open") {
    return (
      <p className="rounded-md bg-neutral-100 p-4 text-sm text-neutral-600">
        Bidding is closed for this deal.
      </p>
    );
  }

  if (!publicKey) {
    return (
      <p className="rounded-md bg-neutral-100 p-4 text-sm text-neutral-600">
        Connect your wallet to place a sealed bid.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h3 className="font-semibold">Place a sealed bid</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Your amount is hidden from everyone — including other bidders — until reveal.
      </p>
      {!isStartup && (
        <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          Bidding currently requires a relay service (not yet deployed) unless you&apos;re
          testing with the deal&apos;s own startup wallet — see the code comment in
          BidForm.tsx.
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={minInvestment}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Min ${minInvestment}`}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!amountValid}
          onClick={() => setConfirming(true)}
          className="whitespace-nowrap rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          Place Bid
        </button>
      </div>
      {status.kind === "success" && (
        <p className="mt-2 text-sm text-green-700">Bid placed. Waiting for reveal.</p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 text-sm text-red-600">Bid failed: {status.message}</p>
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
