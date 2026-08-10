"use client";

import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL, type Connection, type PublicKey } from "@solana/web3.js";

/** Devnet SOL balance for the connected wallet, in SOL (not lamports). */
export function useSolBalance(publicKey: PublicKey | null, connection: Connection): number | null {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  return balance;
}
