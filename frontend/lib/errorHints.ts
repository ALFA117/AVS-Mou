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
