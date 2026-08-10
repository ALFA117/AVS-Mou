import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PublicKey } from "@solana/web3.js";

const getAuthToken = vi.fn<
  (url: string, pubkey: PublicKey, sign: (message: Uint8Array) => Promise<Uint8Array>) => Promise<{
    token: string;
    expiresAt: number;
  }>
>(async () => ({ token: "fake-token", expiresAt: 0 }));
const verifyTeeRpcIntegrity = vi.fn<(url: string) => Promise<undefined>>(async () => undefined);

vi.mock("@magicblock-labs/ephemeral-rollups-sdk", () => ({
  getAuthToken: (...args: Parameters<typeof getAuthToken>) => getAuthToken(...args),
  verifyTeeRpcIntegrity: (...args: Parameters<typeof verifyTeeRpcIntegrity>) => verifyTeeRpcIntegrity(...args),
}));

describe("getAnonymousTeeConnection", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthToken.mockClear();
    verifyTeeRpcIntegrity.mockClear();
  });

  it("only authenticates once across repeated calls (caches the connection)", async () => {
    const { getAnonymousTeeConnection } = await import("@/lib/ephemeralRollup");

    const first = await getAnonymousTeeConnection();
    const second = await getAnonymousTeeConnection();

    expect(first).toBe(second);
    expect(getAuthToken).toHaveBeenCalledTimes(1);
    expect(verifyTeeRpcIntegrity).toHaveBeenCalledTimes(1);
  });

  it("generates a fresh, never-reused keypair per module load — not the same identity twice", async () => {
    const { getAnonymousTeeConnection: firstLoad } = await import("@/lib/ephemeralRollup");
    await firstLoad();
    const firstCall = getAuthToken.mock.calls[0];
    if (!firstCall) throw new Error("getAuthToken was not called");
    const firstAuthPubkey = firstCall[1];

    vi.resetModules();
    getAuthToken.mockClear();

    const { getAnonymousTeeConnection: secondLoad } = await import("@/lib/ephemeralRollup");
    await secondLoad();
    const secondCall = getAuthToken.mock.calls[0];
    if (!secondCall) throw new Error("getAuthToken was not called");
    const secondAuthPubkey = secondCall[1];

    expect(firstAuthPubkey.equals(secondAuthPubkey)).toBe(false);
  });
});
