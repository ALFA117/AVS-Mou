import { NextResponse } from "next/server";
import { relayErConnection } from "@/lib/relayServer";
import { checkIpRateLimit, clientIp, RateLimitedError } from "@/lib/rateLimiter";

/**
 * Clients building a place_bid/cast_vote transaction need a blockhash valid
 * on the Ephemeral Rollup, not L1 — the client has no TEE auth of its own
 * (only the relay sponsor does), so it asks here instead of calling
 * connection.getLatestBlockhash() directly against the ER.
 *
 * Must be dynamic: Next.js caches GET route handlers by default, which
 * would silently freeze this to whatever blockhash was returned on the
 * very first request — every later transaction would fail with "Blockhash
 * not found" (found the hard way; see docs/KNOWN_ISSUES.md if it recurs).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Same reasoning as /api/relay/submit — this hits the ER's live RPC on
    // every call, so an unbounded client (or a script hammering it directly)
    // can generate real load with no on-chain cost of its own to deter it.
    checkIpRateLimit(clientIp(request), 30, 60_000);

    const connection = await relayErConnection();
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    return NextResponse.json({ blockhash });
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
