import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

/**
 * Server-only devnet test-token faucet. Every deal's funding_mint is a
 * freshly-created test SPL token that only the deal's startup wallet ever
 * holds any supply of — a real investor's wallet has zero balance and can
 * never place a bid, since place_bid's one-time ER-delegation step needs to
 * move `amount` of that exact token (see lib/ephemeralDelegation.ts). A
 * public devnet SOL faucet can't help with this — it's not SOL, it's a
 * bespoke test mint. This gives anyone a way to self-serve some, so a demo
 * bid is actually completable.
 *
 * Uses a dedicated keypair (FAUCET_AUTHORITY_SECRET_KEY), never the
 * startup/deployer wallet — this route is public and unauthenticated, so
 * blast radius is capped to "some devnet test tokens + a little devnet SOL",
 * not anything with real program-upgrade authority.
 */

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

let cachedAuthority: Keypair | null = null;

export function faucetAuthorityKeypair(): Keypair {
  if (cachedAuthority) return cachedAuthority;
  const raw = process.env.FAUCET_AUTHORITY_SECRET_KEY;
  if (!raw) {
    throw new Error("FAUCET_AUTHORITY_SECRET_KEY is not set on the server");
  }
  const secretKey = Uint8Array.from(JSON.parse(raw) as number[]);
  cachedAuthority = Keypair.fromSecretKey(secretKey);
  return cachedAuthority;
}

export function faucetConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

// Best-effort in-memory cooldown — resets on cold start, and doesn't
// coordinate across serverless instances. Not a real abuse defense (there
// is none needed: devnet tokens are worthless), just a courtesy limit so a
// stuck client retry-loop can't drain the faucet's SOL float in a burst.
const lastRequestAt = new Map<string, number>();
const COOLDOWN_MS = 30_000;

export class FaucetRejectedError extends Error {}

export function checkCooldown(key: string): void {
  const last = lastRequestAt.get(key);
  const now = Date.now();
  if (last && now - last < COOLDOWN_MS) {
    throw new FaucetRejectedError(
      `Please wait ${Math.ceil((COOLDOWN_MS - (now - last)) / 1000)}s before requesting again`,
    );
  }
  lastRequestAt.set(key, now);
}

export function isPublicKey(value: string): value is string {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
