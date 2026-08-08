import { Connection, Keypair, Transaction, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { SEALED_AUCTION_PROGRAM_ID, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";

/**
 * Server-only. Never import this from a "use client" component — it reads
 * RELAY_SPONSOR_SECRET_KEY (no NEXT_PUBLIC_ prefix, so Next.js already
 * refuses to inline it client-side, but keep the import boundary explicit).
 */

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

// The sponsor only ever pays rent/fees for place_bid and cast_vote — never
// acts as a generic fee-payer for arbitrary transactions.
const ALLOWED_PROGRAM_IDS = new Set([
  SEALED_AUCTION_PROGRAM_ID.toBase58(),
  PRIVATE_VOTING_PROGRAM_ID.toBase58(),
]);

let cachedSponsor: Keypair | null = null;

export function relaySponsorKeypair(): Keypair {
  if (cachedSponsor) return cachedSponsor;
  const raw = process.env.RELAY_SPONSOR_SECRET_KEY;
  if (!raw) {
    throw new Error("RELAY_SPONSOR_SECRET_KEY is not set on the server");
  }
  const secretKey = Uint8Array.from(JSON.parse(raw) as number[]);
  cachedSponsor = Keypair.fromSecretKey(secretKey);
  return cachedSponsor;
}

export function relayConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

export class RelayRejectedError extends Error {}

/** Defense in depth on top of the on-chain program constraints. */
export function assertRelayableTransaction(tx: Transaction): void {
  if (tx.instructions.length === 0) {
    throw new RelayRejectedError("Transaction has no instructions");
  }
  if (tx.instructions.length > 2) {
    throw new RelayRejectedError("Transaction has too many instructions");
  }
  for (const ix of tx.instructions) {
    if (!ALLOWED_PROGRAM_IDS.has(ix.programId.toBase58())) {
      throw new RelayRejectedError(
        `Instruction targets a program the relay doesn't sponsor: ${ix.programId.toBase58()}`,
      );
    }
  }
}

export function assertFeePayerIsSponsor(tx: Transaction, sponsor: PublicKey): void {
  if (!tx.feePayer || !tx.feePayer.equals(sponsor)) {
    throw new RelayRejectedError("Transaction fee payer must be the relay sponsor");
  }
}
