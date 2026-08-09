"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";

/** Minimal connect button — relies on Wallet Standard auto-detected wallets. */
export function WalletConnectButton() {
  const { wallets, wallet, select, connect, disconnect, connecting, connected, publicKey } =
    useWallet();
  const { t } = useTranslation();
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
      <motion.button
        type="button"
        onClick={() => void disconnect()}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
      >
        {shortenAddress(publicKey.toBase58())}
      </motion.button>
    );
  }

  if (wallets.length === 0) {
    return (
      <span className="max-w-[6.5rem] truncate text-xs text-muted-foreground sm:max-w-none sm:whitespace-nowrap sm:text-sm">
        {t("walletConnect.noWallet")}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={connecting}
      onClick={() => {
        pendingConnect.current = true;
        select(wallets[0].adapter.name);
      }}
      whileTap={!connecting ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {connecting ? t("walletConnect.connecting") : t("walletConnect.connect")}
    </motion.button>
  );
}
