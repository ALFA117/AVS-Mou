import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAuthToken, verifyTeeRpcIntegrity } from "@magicblock-labs/ephemeral-rollups-sdk";
import nacl from "tweetnacl";

/**
 * Client-side TEE auth for MagicBlock's Private Ephemeral Rollup, using the
 * connected wallet's own signMessage — for actions a user does themselves
 * (like a startup calling init_deal_permission when creating a deal), as
 * opposed to the relay's sponsor-authenticated connection (server-side,
 * see lib/relayServer.ts) used for place_bid/cast_vote. See docs/RELAY.md
 * and docs/KNOWN_ISSUES.md for why this exists at all.
 */

const TEE_RPC_URL = "https://devnet-tee.magicblock.app";
const TEE_WS_URL = "wss://devnet-tee.magicblock.app";
export const ER_VALIDATOR = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");

let anonTeeConnection: Promise<Connection> | null = null;

/**
 * Read-only TEE connection authenticated with a throwaway, never-funded
 * keypair generated fresh in the browser — for PUBLIC listing pages (Deals,
 * stats) with no connected wallet. Every deal in this app delegates
 * specifically to `ER_VALIDATOR` (the TEE validator) — the plain regional
 * hosted RPCs (devnet-us/eu/as) are *different* validators and silently
 * fall back to a frozen L1 snapshot for accounts they don't actually host,
 * so they only ever show a deal's state as of `initialize_deal`, never any
 * later bid/reveal/settle activity (see docs/KNOWN_ISSUES.md). Deal/Bid
 * *account existence and terms* aren't identity-gated — only sealed bid
 * amounts pre-reveal are — so any identity can authenticate and read
 * current state; the keypair here exists only to sign the auth handshake.
 */
export async function getAnonymousTeeConnection(): Promise<Connection> {
  anonTeeConnection ??= (async () => {
    await verifyTeeRpcIntegrity(TEE_RPC_URL);
    const anon = Keypair.generate();
    const { token } = await getAuthToken(TEE_RPC_URL, anon.publicKey, async (message: Uint8Array) =>
      nacl.sign.detached(message, anon.secretKey),
    );
    return new Connection(`${TEE_RPC_URL}?token=${token}`, { commitment: "confirmed" });
  })();
  return anonTeeConnection;
}

export async function getWalletErConnection(
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<Connection> {
  await verifyTeeRpcIntegrity(TEE_RPC_URL);
  const { token } = await getAuthToken(TEE_RPC_URL, publicKey, signMessage);
  return new Connection(`${TEE_RPC_URL}?token=${token}`, {
    wsEndpoint: `${TEE_WS_URL}?token=${token}`,
    commitment: "confirmed",
  });
}
