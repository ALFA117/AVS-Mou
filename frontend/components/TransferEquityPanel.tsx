"use client";

import { useState } from "react";
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
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  async function submit() {
    if (!publicKey || !wallet?.adapter) return;
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
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-medium">Transfer equity to another member</h3>
      <div className="mt-3 space-y-2">
        <input
          placeholder="Recipient wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Equity amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!recipient || !amount}
            onClick={() => void submit()}
            className="whitespace-nowrap rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            Transfer
          </button>
        </div>
      </div>
      {status.kind === "success" && (
        <p className="mt-2 text-sm text-green-700">Transfer sent.</p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 text-sm text-red-600">Transfer failed: {status.message}</p>
      )}
    </div>
  );
}
