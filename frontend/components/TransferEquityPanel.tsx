"use client";

import { useState } from "react";
import { ArrowRightLeft, CircleCheck, CircleAlert } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { splTokenManagerProgram } from "@/lib/programs";
import type { Syndicate } from "@/lib/types";

/**
 * Task 068: propose a transfer of equity to another syndicate member.
 * Wraps spl-token-manager's `transfer_equity` — see that program's README
 * for why this is a plain SPL transfer regardless of whether it runs on L1
 * or (once delegated) gaslessly on the ER.
 */
export function TransferEquityPanel({ syndicate }: { syndicate: Syndicate }) {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  async function submit() {
    if (!publicKey || !wallet?.adapter) return;
    setSubmitting(true);
    setStatus({ kind: "idle" });
    try {
      const mint = new PublicKey(syndicate.equityMint);
      const recipientPk = new PublicKey(recipient);
      const program = splTokenManagerProgram(connection, wallet.adapter as never);

      const tx = await program.methods
        .transferEquity(new BN(amount))
        .accounts({
          payer: publicKey,
          from: getAssociatedTokenAddressSync(mint, publicKey),
          to: getAssociatedTokenAddressSync(mint, recipientPk),
        })
        .transaction();

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setStatus({ kind: "success" });
      setRecipient("");
      setAmount("");
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-card-foreground">
        <ArrowRightLeft className="h-4 w-4 text-primary" strokeWidth={2} />
        Transfer equity to another member
      </h3>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="transfer-recipient" className="text-xs text-muted-foreground">
            Recipient wallet address
          </label>
          <input
            id="transfer-recipient"
            placeholder="e.g. 7xKX...gAsU"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          <div className="w-full">
            <label htmlFor="transfer-amount" className="text-xs text-muted-foreground">
              Equity amount
            </label>
            <input
              id="transfer-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            disabled={!recipient || !amount || submitting}
            onClick={() => {
              if (window.confirm(`Transfer ${amount} equity to ${recipient}? This can't be undone.`)) {
                void submit();
              }
            }}
            className="mt-5 h-11 cursor-pointer whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Transferring…" : "Transfer"}
          </button>
        </div>
      </div>
      {status.kind === "success" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <CircleCheck className="h-4 w-4" strokeWidth={2} />
          Transfer sent.
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <CircleAlert className="h-4 w-4" strokeWidth={2} />
          Transfer failed: {status.message}
        </p>
      )}
    </div>
  );
}
