import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { delegateSpl } from "@magicblock-labs/ephemeral-rollups-sdk";

const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const VALIDATOR = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");

/**
 * place_bid/cast_vote run on MagicBlock's Private Ephemeral Rollup, and the
 * SPL transfer inside place_bid needs the investor's own funding-token
 * account to already be delegated there (see docs/RELAY.md) — otherwise
 * the ER sees a zero balance regardless of what L1 shows. This is a
 * one-time step per (investor, funding mint) pair, paid by the investor's
 * own wallet (a few thousand lamports) since it isn't part of any single
 * bid — the relay sponsors per-bid rent/fees, not this setup step.
 */
export async function isFundingAccountDelegated(
  connection: Connection,
  fundingAccount: PublicKey,
): Promise<boolean> {
  const info = await connection.getAccountInfo(fundingAccount);
  if (!info) return false;
  return info.owner.equals(DELEGATION_PROGRAM_ID);
}

export async function delegateFundingAccount(params: {
  connection: Connection;
  owner: PublicKey;
  mint: PublicKey;
  amount: bigint;
  sendTransaction: (tx: Transaction) => Promise<string>;
}): Promise<void> {
  const { connection, owner, mint, amount, sendTransaction } = params;
  const ixs = await delegateSpl(owner, mint, amount, {
    validator: VALIDATOR,
    idempotent: false,
    initVaultIfMissing: true,
    payer: owner,
  });
  const tx = new Transaction().add(...ixs);
  const sig = await sendTransaction(tx);
  await connection.confirmTransaction(sig, "confirmed");
}
