import { NextResponse } from "next/server";
import { relaySponsorKeypair } from "@/lib/relayServer";

export async function GET() {
  try {
    const sponsor = relaySponsorKeypair();
    return NextResponse.json({ pubkey: sponsor.publicKey.toBase58() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
