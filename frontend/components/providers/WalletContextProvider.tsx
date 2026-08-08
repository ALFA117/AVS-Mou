"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";

/**
 * Minimal wallet context — relies on Wallet Standard auto-detection
 * (Phantom, Solflare, Backpack, etc. all register themselves), so no
 * per-wallet adapter packages are needed here.
 *
 * NOTE: @solana/wallet-adapter-react ships a nested @types/react@19 that
 * clashes with our React 18 JSX types ("ConnectionProvider cannot be used
 * as a JSX component"). Fixed via the root-level `overrides` field in
 * package.json pinning @types/react to 18.2.79 everywhere — do not bump
 * @types/react without checking this still resolves to one version
 * (`find node_modules -path "*@types/react/package.json"` should show
 * exactly one hit).
 */
export function WalletContextProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet"),
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
