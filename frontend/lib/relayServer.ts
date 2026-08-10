import { Connection, Keypair, Transaction, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import * as nacl from "tweetnacl";
import { getAuthToken, verifyTeeRpcIntegrity } from "@magicblock-labs/ephemeral-rollups-sdk";
import { SEALED_AUCTION_PROGRAM_ID, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";

/**
 * Server-only. Never import this from a "use client" component — it reads
 * RELAY_SPONSOR_SECRET_KEY (no NEXT_PUBLIC_ prefix, so Next.js already
 * refuses to inline it client-side, but keep the import boundary explicit).
 */

// place_bid/cast_vote only ever exist on MagicBlock's Private Ephemeral
// Rollup (bid/vote are `eph`-only accounts) — see docs/RELAY.md and
// docs/KNOWN_ISSUES.md for why L1 alone was never enough.
const TEE_RPC_URL = "https://devnet-tee.magicblock.app";
const TEE_WS_URL = "wss://devnet-tee.magicblock.app";

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

let cachedErConnection: { connection: Connection; expiresAt: number } | null = null;

/**
 * A TEE-authenticated connection to MagicBlock's hosted Private Ephemeral
 * Rollup, authenticated as the relay sponsor. Tokens expire (SDK's
 * SESSION_DURATION) — cached and refreshed a bit early rather than per-call.
 */
export async function relayErConnection(): Promise<Connection> {
  const now = Date.now();
  if (cachedErConnection && cachedErConnection.expiresAt > now) {
    return cachedErConnection.connection;
  }

  await verifyTeeRpcIntegrity(TEE_RPC_URL);
  const sponsor = relaySponsorKeypair();
  const { token, expiresAt } = await getAuthToken(TEE_RPC_URL, sponsor.publicKey, (message: Uint8Array) =>
    Promise.resolve(nacl.sign.detached(message, sponsor.secretKey)),
  );

  const connection = new Connection(`${TEE_RPC_URL}?token=${token}`, {
    wsEndpoint: `${TEE_WS_URL}?token=${token}`,
    commitment: "confirmed",
  });
  // expiresAt is in seconds per the SDK; refresh 60s early.
  cachedErConnection = { connection, expiresAt: expiresAt * 1000 - 60_000 };
  return connection;
}

export class RelayRejectedError extends Error {}

/** Defense in depth on top of the on-chain program constraints. */
export function assertRelayableTransaction(tx: Transaction): void {
  // Many wallets (Phantom included) auto-prepend one or two
  // ComputeBudgetProgram instructions (unit limit / priority fee) when
  // signing — outside the app's control, and harmless on their own: that
  // program can only adjust the transaction's own compute budget, never
  // move funds or invoke arbitrary logic. Exclude them from validation so a
  // wallet's own fee-optimization doesn't get a legitimate bid/vote
  // rejected as "too many instructions" (seen in practice with Phantom).
  const realInstructions = tx.instructions.filter(
    (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
  );
  if (realInstructions.length === 0) {
    throw new RelayRejectedError("Transaction has no instructions");
  }
  if (realInstructions.length > 2) {
    throw new RelayRejectedError("Transaction has too many instructions");
  }
  for (const ix of realInstructions) {
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
