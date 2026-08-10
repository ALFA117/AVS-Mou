import { NextResponse } from "next/server";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  faucetAuthorityKeypair,
  faucetConnection,
  checkCooldown,
  isPublicKey,
  FaucetRejectedError,
} from "@/lib/faucetServer";
import { checkIpRateLimit, clientIp, RateLimitedError } from "@/lib/rateLimiter";

const FAUCET_AMOUNT_WHOLE_TOKENS = 10_000;
const SOL_TOPUP_LAMPORTS = 0.02 * LAMPORTS_PER_SOL;
const SOL_TOPUP_THRESHOLD_LAMPORTS = 0.01 * LAMPORTS_PER_SOL;

export async function POST(request: Request) {
  try {
    // Per-recipient cooldown (checkCooldown below) alone can't stop a
    // script that just generates a fresh wallet address each request — an
    // IP-level cap closes that gap.
    checkIpRateLimit(clientIp(request), 10, 60_000);

    const body = (await request.json()) as { recipient?: string; mint?: string };
    if (!body.recipient || !isPublicKey(body.recipient)) {
      return NextResponse.json({ error: "Missing or invalid 'recipient'" }, { status: 400 });
    }
    if (!body.mint || !isPublicKey(body.mint)) {
      return NextResponse.json({ error: "Missing or invalid 'mint'" }, { status: 400 });
    }

    const recipient = new PublicKey(body.recipient);
    const mint = new PublicKey(body.mint);
    checkCooldown(`${recipient.toBase58()}:${mint.toBase58()}`);

    const authority = faucetAuthorityKeypair();
    const connection = faucetConnection();

    const mintInfo = await getMint(connection, mint);
    if (!mintInfo.mintAuthority || !mintInfo.mintAuthority.equals(authority.publicKey)) {
      throw new FaucetRejectedError("This token isn't one the faucet controls");
    }

    const recipientAta = getAssociatedTokenAddressSync(mint, recipient);
    const amount = BigInt(FAUCET_AMOUNT_WHOLE_TOKENS) * BigInt(10 ** mintInfo.decimals);

    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        authority.publicKey,
        recipientAta,
        recipient,
        mint,
      ),
      createMintToInstruction(mint, recipientAta, authority.publicKey, amount),
    );

    const recipientBalance = await connection.getBalance(recipient);
    let toppedUpSol = false;
    if (recipientBalance < SOL_TOPUP_THRESHOLD_LAMPORTS) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: recipient,
          lamports: SOL_TOPUP_LAMPORTS,
        }),
      );
      toppedUpSol = true;
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = authority.publicKey;
    tx.recentBlockhash = blockhash;
    tx.sign(authority);

    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    const status = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (status.value.err) {
      return NextResponse.json(
        { error: `Faucet transaction failed: ${JSON.stringify(status.value.err)}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      signature,
      amount: FAUCET_AMOUNT_WHOLE_TOKENS,
      toppedUpSol,
    });
  } catch (err) {
    if (err instanceof FaucetRejectedError || err instanceof RateLimitedError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
