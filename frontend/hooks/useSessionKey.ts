"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import {
  createSession,
  clearSession,
  isSessionValid,
  loadSession,
  revokeSession,
  type StoredSession,
} from "@/lib/sessionKeys";

export type SessionKeyState =
  | { status: "no-wallet" }
  | { status: "unauthorized" }
  | { status: "authorizing" }
  | { status: "active"; session: StoredSession; expiresAt: Date }
  | { status: "error"; message: string };

/**
 * Drives the "Authorize with wallet (one-time)" / "Authorized till [time]" /
 * revoke UI (AVS_100_TASKS.md task 048) for a given program. See
 * docs/SESSION_KEYS.md.
 */
export function useSessionKey(targetProgram: PublicKey) {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction } = useWallet();
  const [state, setState] = useState<SessionKeyState>({ status: "no-wallet" });

  const refresh = useCallback(() => {
    if (!publicKey) {
      setState({ status: "no-wallet" });
      return;
    }
    const session = loadSession(targetProgram, publicKey);
    if (isSessionValid(session)) {
      setState({ status: "active", session, expiresAt: new Date(session.validUntil * 1000) });
    } else {
      setState({ status: "unauthorized" });
    }
  }, [publicKey, targetProgram]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000); // catch expiry without a page reload
    return () => clearInterval(interval);
  }, [refresh]);

  const authorize = useCallback(
    async (lifetimeSeconds?: number) => {
      if (!publicKey || !wallet?.adapter) {
        setState({ status: "no-wallet" });
        return;
      }
      setState({ status: "authorizing" });
      try {
        const session = await createSession({
          connection,
          // wallet-adapter's adapter satisfies the subset of Anchor's
          // Wallet interface createSession needs (publicKey + signing via
          // sendTransaction, passed separately below).
          wallet: { publicKey } as never,
          targetProgram,
          sendTransaction: (tx) => sendTransaction(tx, connection),
          lifetimeSeconds,
        });
        setState({
          status: "active",
          session,
          expiresAt: new Date(session.validUntil * 1000),
        });
      } catch (err) {
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      }
    },
    [connection, publicKey, wallet, sendTransaction, targetProgram],
  );

  const revoke = useCallback(async () => {
    if (!publicKey) return;
    try {
      await revokeSession({
        connection,
        wallet: { publicKey } as never,
        targetProgram,
        sendTransaction: (tx) => sendTransaction(tx, connection),
      });
    } catch {
      // Revoke is best-effort from the UI's perspective — even if the
      // on-chain call fails, drop the local copy so the UI stops offering
      // to use a session the user asked to end.
      clearSession(targetProgram, publicKey);
    }
    setState({ status: "unauthorized" });
  }, [connection, publicKey, sendTransaction, targetProgram]);

  return { state, authorize, revoke, refresh };
}
