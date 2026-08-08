import { NextResponse } from "next/server";
import { Transaction } from "@solana/web3.js";
import {
  relaySponsorKeypair,
  relayConnection,
  assertRelayableTransaction,
  assertFeePayerIsSponsor,
  RelayRejectedError,
} from "@/lib/relayServer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transaction?: string };
    if (!body.transaction) {
      return NextResponse.json({ error: "Missing 'transaction' field" }, { status: 400 });
    }

    const tx = Transaction.from(Buffer.from(body.transaction, "base64"));
    const sponsor = relaySponsorKeypair();

    assertFeePayerIsSponsor(tx, sponsor.publicKey);
    assertRelayableTransaction(tx);

    tx.partialSign(sponsor);

    const connection = relayConnection();
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    return NextResponse.json({ signature });
  } catch (err) {
    if (err instanceof RelayRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
