"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

export type ServiceStatus = "checking" | "up" | "down";

export interface SystemStatus {
  solana: ServiceStatus;
  solanaSlot: number | null;
  magicblockEr: ServiceStatus;
}

const ER_RPC_URL =
  process.env.NEXT_PUBLIC_MAGICBLOCK_ER_RPC_URL || "https://devnet-us.magicblock.app";

async function pingJsonRpc(url: string, method: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Task 081: basic connectivity checks for the base layer + hosted ER. */
export function useSystemStatus() {
  const { connection } = useConnection();
  const [status, setStatus] = useState<SystemStatus>({
    solana: "checking",
    solanaSlot: null,
    magicblockEr: "checking",
  });

  const refresh = useCallback(async () => {
    setStatus((s) => ({ ...s, solana: "checking", magicblockEr: "checking" }));

    connection
      .getSlot("confirmed")
      .then((slot) => setStatus((s) => ({ ...s, solana: "up", solanaSlot: slot })))
      .catch(() => setStatus((s) => ({ ...s, solana: "down" })));

    pingJsonRpc(ER_RPC_URL, "getHealth").then((ok) =>
      setStatus((s) => ({ ...s, magicblockEr: ok ? "up" : "down" })),
    );
  }, [connection]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, refresh, erEndpoint: ER_RPC_URL };
}
