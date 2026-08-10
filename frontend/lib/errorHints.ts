/**
 * Every on-chain account this app touches only exists on Solana Devnet.
 * Multi-chain wallets (MetaMask's Solana support, some mobile wallets) can
 * default their *active* Solana network to Mainnet independently of which
 * cluster the dApp itself talks to — the wallet then simulates the
 * transaction against mainnet before ever asking the dApp, finds none of
 * these accounts exist there, and shows a scary "reverted during
 * simulation" warning. A user seeing that almost always clicks Cancel,
 * which surfaces as a plain "User rejected the request" error with no clue
 * why. Recognized from a real report this session (MetaMask showed
 * "Network: Solana Mainnet" in its confirm dialog for a devnet-only vote).
 */
const NETWORK_MISMATCH_PATTERNS = [
  /reverted during simulation/i,
  /user rejected/i,
  /simulation failed/i,
];

export function isLikelyNetworkMismatch(message: string): boolean {
  return NETWORK_MISMATCH_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * wallet-adapter's WalletError subclasses (WalletSendTransactionError,
 * WalletSignTransactionError, ...) set `.message` to a generic string like
 * "Unexpected error" and stash the actual cause — often a simulation
 * failure with real program logs — on an untyped `.error` property that
 * every naive `err.message` read silently discards. Unwrap it so users
 * (and we, when they report a bug) see the real failure instead of a dead
 * end. Falls back through increasingly generic shapes so this never throws
 * on an error it doesn't recognize.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    const nested = (err as { error?: unknown }).error;
    if (nested instanceof Error && nested.message) return nested.message;
    if (nested && typeof nested === "object") {
      const logs = (nested as { logs?: unknown }).logs;
      if (Array.isArray(logs) && logs.length > 0) return `${err.message}: ${logs.join(" | ")}`;
      const nestedMessage = (nested as { message?: unknown }).message;
      if (typeof nestedMessage === "string" && nestedMessage) return nestedMessage;
    }
    return err.message;
  }
  return String(err);
}
