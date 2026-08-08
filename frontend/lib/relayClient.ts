import type { Transaction } from "@solana/web3.js";

let cachedSponsorPubkey: string | null = null;

/** The relay's fee-payer pubkey — callers set this as `payer` before signing. */
export async function fetchRelaySponsorPubkey(): Promise<string> {
  if (cachedSponsorPubkey) return cachedSponsorPubkey;
  const res = await fetch("/api/relay/sponsor");
  const data = (await res.json()) as { pubkey?: string; error?: string };
  if (!res.ok || !data.pubkey) {
    throw new Error(data.error || "Could not reach the relay sponsor endpoint");
  }
  cachedSponsorPubkey = data.pubkey;
  return data.pubkey;
}

/** Submits a transaction already signed by the caller (investor wallet or
 * session key) — the relay adds the sponsor's signature and broadcasts it. */
export async function submitViaRelay(tx: Transaction): Promise<string> {
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  const res = await fetch("/api/relay/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: serialized.toString("base64") }),
  });
  const data = (await res.json()) as { signature?: string; error?: string };
  if (!res.ok || !data.signature) {
    throw new Error(data.error || "Relay submit failed");
  }
  return data.signature;
}
