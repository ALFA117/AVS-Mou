"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronDown, LogOut, Loader2 } from "lucide-react";
import { shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";

/**
 * Relies on Wallet Standard auto-detected wallets (Phantom, Solflare,
 * Backpack, etc. all register themselves — see WalletContextProvider).
 * Shows every detected wallet in a picker rather than silently connecting
 * to whichever one happened to register first, and lets a connected user
 * switch to a different detected wallet without a separate disconnect step.
 */
export function WalletConnectButton() {
  const { wallets, wallet, select, connect, disconnect, connecting, connected, publicKey } =
    useWallet();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // `select` only updates which adapter is active; connecting has to happen
  // in a follow-up render once that adapter is actually set, or `connect()`
  // races against a still-null `wallet`.
  const pendingConnect = useRef(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingConnect.current && wallet && !connected && !connecting) {
      pendingConnect.current = false;
      connect().catch(() => {
        // user closed the wallet popup — nothing to surface
      });
    }
  }, [wallet, connected, connecting, connect]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function chooseWallet(name: (typeof wallets)[number]["adapter"]["name"]) {
    pendingConnect.current = true;
    select(name);
    setOpen(false);
  }

  if (wallets.length === 0 && !connected) {
    return (
      <span
        title={t("walletConnect.noWallet")}
        className="max-w-[3.5rem] truncate text-xs text-muted-foreground sm:max-w-[9rem] sm:text-sm"
      >
        {t("walletConnect.noWallet")}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        disabled={connecting}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        whileTap={!connecting ? { scale: 0.96 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={
          connected && publicKey
            ? "flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
            : "flex cursor-pointer items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {connected && publicKey
          ? shortenAddress(publicKey.toBase58())
          : connecting
            ? t("walletConnect.connecting")
            : t("walletConnect.connect")}
        {connecting ? (
          <motion.span
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="flex"
          >
            <Loader2 className="h-3.5 w-3.5" strokeWidth={2} />
          </motion.span>
        ) : (
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 min-w-56 overflow-hidden rounded-md border border-border bg-surface-elevated p-1 shadow-lg"
          >
            {connected && publicKey && (
              <p className="truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                {publicKey.toBase58()}
              </p>
            )}
            <p className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {connected ? t("walletConnect.switchWallet") : t("walletConnect.chooseWallet")}
            </p>
            {wallets.map((w) => {
              const active = connected && wallet?.adapter.name === w.adapter.name;
              return (
                <button
                  key={w.adapter.name}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={active}
                  onClick={() => chooseWallet(w.adapter.name)}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm text-foreground transition-colors duration-200 hover:bg-muted disabled:cursor-default disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.adapter.icon} alt="" className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{w.adapter.name}</span>
                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                </button>
              );
            })}
            {connected && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void disconnect();
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-600 transition-colors duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("walletConnect.disconnect")}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
