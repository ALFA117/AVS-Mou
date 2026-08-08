"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "@/lib/format";

/** Minimal connect button — relies on Wallet Standard auto-detected wallets. */
export function WalletConnectButton() {
  const { wallets, wallet, select, connect, disconnect, connecting, connected, publicKey } =
    useWallet();
  // `select` only updates which adapter is active; connecting has to happen
  // in a follow-up render once that adapter is actually set, or `connect()`
  // races against a still-null `wallet`.
  const pendingConnect = useRef(false);

  useEffect(() => {
    if (pendingConnect.current && wallet && !connected && !connecting) {
      pendingConnect.current = false;
      connect().catch(() => {
        // user closed the wallet popup — nothing to surface
      });
    }
  }, [wallet, connected, connecting, connect]);

  if (connected && publicKey) {
    return (
      <button
        type="button"
        onClick={() => void disconnect()}
        className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        {shortenAddress(publicKey.toBase58())}
      </button>
    );
  }

  if (wallets.length === 0) {
    return <span className="text-sm text-muted-foreground">No Solana wallet detected</span>;
  }

  return (
    <button
      type="button"
      disabled={connecting}
      onClick={() => {
        pendingConnect.current = true;
        select(wallets[0].adapter.name);
      }}
      className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
