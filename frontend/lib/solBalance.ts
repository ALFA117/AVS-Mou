// Creating a deal or milestone funds rent for ~6 new accounts (main
// account, funding/ephemeral ATA, buffer, record, metadata) plus a small
// sponsor_lamports amount — a live devnet reproduction of that exact flow
// cost ~0.013 SOL. Smaller actions (equity transfer, reveal/settle) cost
// less, but share the same failure mode: a WalletSendTransactionError with
// no useful detail once the wallet runs out of SOL mid-transaction. One
// threshold, comfortably above the most expensive case, covers all of them.
export const LOW_BALANCE_THRESHOLD_SOL = 0.05;

export function isLowBalance(solBalance: number | null): boolean {
  return solBalance !== null && solBalance < LOW_BALANCE_THRESHOLD_SOL;
}
