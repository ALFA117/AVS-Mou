import { NextResponse } from "next/server";
import { Transaction } from "@solana/web3.js";
import {
  relaySponsorKeypair,
  relayErConnection,
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

    // place_bid/cast_vote only exist on the Private Ephemeral Rollup — see
    // docs/RELAY.md and docs/KNOWN_ISSUES.md.
    const connection = await relayErConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    // Confirm server-side — the client has no TEE auth of its own to
    // confirm against the ER directly.
    const status = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (status.value.err) {
      return NextResponse.json(
        { error: `Transaction failed: ${JSON.stringify(status.value.err)}` },
        { status: 400 },
      );
    }

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
