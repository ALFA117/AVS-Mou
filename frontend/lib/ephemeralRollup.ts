import { Connection, PublicKey } from "@solana/web3.js";
import { getAuthToken, verifyTeeRpcIntegrity } from "@magicblock-labs/ephemeral-rollups-sdk";

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

/**
 * Plain (non-TEE) hosted devnet ER RPC — used for read-only account listing
 * only. Deal/Bid *account existence and terms* aren't access-controlled
 * (only sealed bid amounts are, via per-account Ephemeral Permissions), so
 * this needs no auth handshake. This matters because `delegate_deal` moves
 * a Deal's L1 owner to the delegation program the moment a deal is
 * created — an L1-only `getProgramAccounts` query never sees an Open deal
 * at all, only ones that made it back through `undelegate_deal` (currently
 * broken — see docs/KNOWN_ISSUES.md). Every public listing must merge L1 +
 * ER results.
 */
export const ER_PUBLIC_RPC_URL = "https://devnet-us.magicblock.app";

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
