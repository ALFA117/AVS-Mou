"use client";

import type { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSessionKey } from "@/hooks/useSessionKey";

/**
 * "Authorize with wallet (one-time)" / "Authorized till [time]" / revoke —
 * AVS_100_TASKS.md task 048. Drop this into a deal or milestone page so
 * bids/votes can be signed without a wallet popup per action.
 */
export function SessionKeyPanel({ targetProgram }: { targetProgram: PublicKey }) {
  const { connected } = useWallet();
  const { state, authorize, revoke } = useSessionKey(targetProgram);

  if (!connected) {
    return <p className="text-sm text-muted-foreground">Connect your wallet to enable one-click signing.</p>;
  }

  switch (state.status) {
    case "no-wallet":
      return null;

    case "unauthorized":
      return (
        <button
          type="button"
          onClick={() => authorize()}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Authorize with wallet (one-time)
        </button>
      );

    case "authorizing":
      return (
        <button type="button" disabled className="rounded-md bg-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600">
          Waiting for wallet signature…
        </button>
      );

    case "active":
      return (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-700">
            Authorized till {state.expiresAt.toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={() => revoke()}
            className="text-red-600 underline hover:text-red-800"
          >
            Revoke
          </button>
        </div>
      );

    case "error":
      return (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-red-600">Session error: {state.message}</span>
          <button
            type="button"
            onClick={() => authorize()}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Retry authorization
          </button>
        </div>
      );
  }
}
