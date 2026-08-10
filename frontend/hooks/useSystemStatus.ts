"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

export type ServiceStatus = "checking" | "up" | "down";

export interface SystemStatus {
  solana: ServiceStatus;
  solanaSlot: number | null;
  solanaLatencyMs: number | null;
  magicblockEr: ServiceStatus;
  erLatencyMs: number | null;
}

const ER_RPC_URL =
  process.env.NEXT_PUBLIC_MAGICBLOCK_ER_RPC_URL || "https://devnet-us.magicblock.app";

async function pingJsonRpc(url: string, method: string): Promise<{ ok: boolean; latencyMs: number }> {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    });
    return { ok: res.ok, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - started) };
  }
}

/** Task 081: basic connectivity checks for the base layer + hosted ER. */
export function useSystemStatus() {
  const { connection } = useConnection();
  const [status, setStatus] = useState<SystemStatus>({
    solana: "checking",
    solanaSlot: null,
    solanaLatencyMs: null,
    magicblockEr: "checking",
    erLatencyMs: null,
  });

  const refresh = useCallback(async () => {
    setStatus((s) => ({ ...s, solana: "checking", magicblockEr: "checking" }));

    const solanaStarted = performance.now();
    connection
      .getSlot("confirmed")
      .then((slot) =>
        setStatus((s) => ({
          ...s,
          solana: "up",
          solanaSlot: slot,
          solanaLatencyMs: Math.round(performance.now() - solanaStarted),
        })),
      )
      .catch(() =>
        setStatus((s) => ({ ...s, solana: "down", solanaLatencyMs: Math.round(performance.now() - solanaStarted) })),
      );

    pingJsonRpc(ER_RPC_URL, "getHealth").then(({ ok, latencyMs }) =>
      setStatus((s) => ({ ...s, magicblockEr: ok ? "up" : "down", erLatencyMs: latencyMs })),
    );
  }, [connection]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, refresh, erEndpoint: ER_RPC_URL };
}
