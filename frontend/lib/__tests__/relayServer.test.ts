// @vitest-environment node
//
// web3.js's buffer-layout encoding (used by ComputeBudgetProgram's
// instruction builders below) needs a real Node Buffer/Uint8Array — jsdom's
// polyfill fails its `instanceof Uint8Array` checks.
import { describe, it, expect } from "vitest";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  assertFeePayerIsSponsor,
  assertRelayableTransaction,
  RelayRejectedError,
} from "@/lib/relayServer";
import { SEALED_AUCTION_PROGRAM_ID, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";

const sponsor = new PublicKey("6mK3xMrQX2iH4RuxK4fY2PRCVsDZhCGRLvvV94qsgw1b");
const someoneElse = Keypair.generate().publicKey;

function txWithProgram(programId: PublicKey): Transaction {
  const tx = new Transaction();
  tx.add({ programId, keys: [], data: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]) });
  return tx;
}

describe("assertFeePayerIsSponsor", () => {
  it("rejects a transaction with no fee payer set", () => {
    const tx = txWithProgram(SEALED_AUCTION_PROGRAM_ID);
    expect(() => assertFeePayerIsSponsor(tx, sponsor)).toThrow(RelayRejectedError);
  });

  it("rejects a transaction whose fee payer isn't the sponsor", () => {
    const tx = txWithProgram(SEALED_AUCTION_PROGRAM_ID);
    tx.feePayer = someoneElse;
    expect(() => assertFeePayerIsSponsor(tx, sponsor)).toThrow(RelayRejectedError);
  });

  it("accepts a transaction whose fee payer is the sponsor", () => {
    const tx = txWithProgram(SEALED_AUCTION_PROGRAM_ID);
    tx.feePayer = sponsor;
    expect(() => assertFeePayerIsSponsor(tx, sponsor)).not.toThrow();
  });
});

describe("assertRelayableTransaction", () => {
  it("rejects a transaction with no instructions", () => {
    const tx = new Transaction();
    expect(() => assertRelayableTransaction(tx)).toThrow(RelayRejectedError);
  });

  it("rejects a transaction with more than 2 instructions", () => {
    const tx = txWithProgram(SEALED_AUCTION_PROGRAM_ID);
    tx.add({ programId: SEALED_AUCTION_PROGRAM_ID, keys: [], data: Buffer.from([1]) });
    tx.add({ programId: SEALED_AUCTION_PROGRAM_ID, keys: [], data: Buffer.from([1]) });
    expect(() => assertRelayableTransaction(tx)).toThrow(RelayRejectedError);
  });

  it("rejects an instruction targeting a program outside the allowlist", () => {
    const tx = txWithProgram(SystemProgram.programId);
    expect(() => assertRelayableTransaction(tx)).toThrow(RelayRejectedError);
  });

  it("rejects a SystemProgram instruction smuggled alongside a legitimate instruction", () => {
    const tx = txWithProgram(SEALED_AUCTION_PROGRAM_ID);
    tx.add({
      programId: SystemProgram.programId,
      keys: [
        { pubkey: sponsor, isSigner: true, isWritable: true },
        { pubkey: someoneElse, isSigner: false, isWritable: true },
      ],
      data: Buffer.from([2, 0, 0, 0, 232, 3, 0, 0, 0, 0, 0, 0]),
    });
    expect(() => assertRelayableTransaction(tx)).toThrow(RelayRejectedError);
  });

  it("accepts a single sealed-auction instruction", () => {
    const tx = txWithProgram(SEALED_AUCTION_PROGRAM_ID);
    expect(() => assertRelayableTransaction(tx)).not.toThrow();
  });

  it("accepts a single private-voting instruction", () => {
    const tx = txWithProgram(PRIVATE_VOTING_PROGRAM_ID);
    expect(() => assertRelayableTransaction(tx)).not.toThrow();
  });

  // Regression: Phantom (and other wallets) auto-prepend one or two
  // ComputeBudgetProgram instructions during signTransaction() for fee
  // optimization — a real vote transaction observed in practice with
  // exactly 1 real instruction plus 2 wallet-injected ones was rejected as
  // "too many instructions" before this exclusion existed.
  it("accepts a legitimate instruction alongside wallet-injected ComputeBudget instructions", () => {
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }));
    tx.add({ programId: PRIVATE_VOTING_PROGRAM_ID, keys: [], data: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]) });
    expect(() => assertRelayableTransaction(tx)).not.toThrow();
  });

  it("still rejects too many real instructions even with ComputeBudget instructions present", () => {
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
    tx.add({ programId: SEALED_AUCTION_PROGRAM_ID, keys: [], data: Buffer.from([1]) });
    tx.add({ programId: SEALED_AUCTION_PROGRAM_ID, keys: [], data: Buffer.from([1]) });
    tx.add({ programId: SEALED_AUCTION_PROGRAM_ID, keys: [], data: Buffer.from([1]) });
    expect(() => assertRelayableTransaction(tx)).toThrow(RelayRejectedError);
  });
});
