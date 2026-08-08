/**
 * AVS session key management — see docs/SESSION_KEYS.md for the full design.
 *
 * A session key is a disposable Solana keypair the browser generates and
 * holds in localStorage. Once the user's real wallet authorizes it (one
 * signature, via `createSession`), the session keypair can sign bids/votes
 * on its own — no wallet popup per action — until it expires or is revoked.
 *
 * localStorage is not a secure secret store (any XSS on this origin can
 * read it). That's an acceptable tradeoff *because* the session key's blast
 * radius is bounded: it can only call the specific instructions our
 * programs gate with a session check (`place_bid`, `cast_vote`), it expires
 * on its own, and it never has custody of funds beyond what the investor
 * has SPL-approved it to move (see sealed-auction's `place_bid` doc
 * comment). It can never touch the user's main wallet or sign for any
 * other program.
 */
import { AnchorProvider, BN, type Wallet } from "@coral-xyz/anchor";
import { Keypair, PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import { SessionTokenManager } from "@magicblock-labs/gum-sdk";

const STORAGE_KEY = "avs.sessionKey.v1";
const SESSION_TOKEN_SEED = "session_token_v2";
export const SESSION_KEYS_PROGRAM_ID = new PublicKey(
  "KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5",
);

export interface StoredSession {
  /** Base58-encoded secret key of the disposable session signer. */
  secretKey: number[];
  /** The real wallet this session was authorized for. */
  authority: string;
  /** Program this session is scoped to (sealed-auction or private-voting). */
  targetProgram: string;
  /** Unix seconds. */
  validUntil: number;
}

export function loadSession(targetProgram: PublicKey, authority: PublicKey): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(targetProgram, authority));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function isSessionValid(session: StoredSession | null): session is StoredSession {
  if (!session) return false;
  return session.validUntil > Math.floor(Date.now() / 1000);
}

export function sessionKeypairFrom(session: StoredSession): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(session.secretKey));
}

export function clearSession(targetProgram: PublicKey, authority: PublicKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(targetProgram, authority));
}

function storageKey(targetProgram: PublicKey, authority: PublicKey): string {
  return `${STORAGE_KEY}.${targetProgram.toBase58()}.${authority.toBase58()}`;
}

export function sessionTokenPda(
  targetProgram: PublicKey,
  sessionSigner: PublicKey,
  authority: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SESSION_TOKEN_SEED),
      targetProgram.toBuffer(),
      sessionSigner.toBuffer(),
      authority.toBuffer(),
    ],
    SESSION_KEYS_PROGRAM_ID,
  )[0];
}

/**
 * Creates (or reuses, if still valid) a session for `targetProgram`,
 * authorized by `wallet`. Requires exactly one wallet signature. Persists
 * the disposable signer to localStorage — call `loadSession` on future
 * visits instead of re-authorizing.
 *
 * @param lifetimeSeconds Defaults to 1 hour (AVS_100_TASKS.md task 042).
 * @param topUpLamports    Funds the session signer's own account so it can
 *                          pay tx fees on session-signed transactions.
 */
export async function createSession(params: {
  connection: Connection;
  wallet: Wallet;
  targetProgram: PublicKey;
  sendTransaction: (tx: Transaction) => Promise<string>;
  lifetimeSeconds?: number;
  topUpLamports?: number;
}): Promise<StoredSession> {
  const {
    connection,
    wallet,
    targetProgram,
    sendTransaction,
    lifetimeSeconds = 3600,
    topUpLamports = 5_000_000, // 0.005 SOL — covers session-signed tx fees + delegation rent
  } = params;

  const existing = loadSession(targetProgram, wallet.publicKey);
  if (isSessionValid(existing)) return existing;

  const sessionKeypair = Keypair.generate();
  const provider = new AnchorProvider(connection, wallet, {});
  const manager = new SessionTokenManager(wallet as never, connection);
  const validUntil = Math.floor(Date.now() / 1000) + lifetimeSeconds;

  const tx = await manager.program.methods
    .createSessionV2(true, new BN(validUntil), new BN(topUpLamports))
    .accounts({
      targetProgram,
      sessionSigner: sessionKeypair.publicKey,
      feePayer: wallet.publicKey,
      authority: wallet.publicKey,
    })
    .transaction();
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  tx.partialSign(sessionKeypair);
  // `provider` only exists to keep the AnchorProvider import used for
  // callers that need it downstream; signing itself goes through the
  // wallet-adapter `sendTransaction` passed in by the caller.
  void provider;

  await sendTransaction(tx);

  const session: StoredSession = {
    secretKey: Array.from(sessionKeypair.secretKey),
    authority: wallet.publicKey.toBase58(),
    targetProgram: targetProgram.toBase58(),
    validUntil,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(targetProgram, wallet.publicKey), JSON.stringify(session));
  }
  return session;
}

/** Revokes an active session. Must be signed by the real wallet, not the session key. */
export async function revokeSession(params: {
  connection: Connection;
  wallet: Wallet;
  targetProgram: PublicKey;
  sendTransaction: (tx: Transaction) => Promise<string>;
}): Promise<void> {
  const { connection, wallet, targetProgram, sendTransaction } = params;
  const session = loadSession(targetProgram, wallet.publicKey);
  if (!session) return;

  const sessionSigner = sessionKeypairFrom(session).publicKey;
  const manager = new SessionTokenManager(wallet as never, connection);
  const tx = await manager.program.methods
    .revokeSessionV2()
    .accounts({
      sessionToken: sessionTokenPda(targetProgram, sessionSigner, wallet.publicKey),
      feePayer: wallet.publicKey,
      authority: wallet.publicKey,
    })
    .transaction();
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

  await sendTransaction(tx);
  clearSession(targetProgram, wallet.publicKey);
}
