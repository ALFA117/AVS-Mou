// @vitest-environment node
//
// PublicKey.findProgramAddressSync needs a real Node Buffer/crypto — jsdom's
// polyfill fails it (see lib/__tests__/relayServer.test.ts for the same
// note). Node has no `window`, so createSession/revokeSession's
// localStorage calls are stubbed in per-test below.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  loadSession,
  isSessionValid,
  sessionKeypairFrom,
  clearSession,
  sessionTokenPda,
  SESSION_KEYS_PROGRAM_ID,
  type StoredSession,
} from "@/lib/sessionKeys";

function localStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    secretKey: Array.from(Keypair.generate().secretKey),
    authority: Keypair.generate().publicKey.toBase58(),
    targetProgram: Keypair.generate().publicKey.toBase58(),
    validUntil: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

describe("sessionKeys localStorage round-trip", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { localStorage: localStorageMock() };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  const targetProgram = Keypair.generate().publicKey;
  const authority = Keypair.generate().publicKey;

  it("returns null when nothing is stored", () => {
    expect(loadSession(targetProgram, authority)).toBeNull();
  });

  it("round-trips a session through the (program, authority)-scoped key", () => {
    const session = makeSession({
      authority: authority.toBase58(),
      targetProgram: targetProgram.toBase58(),
    });
    window.localStorage.setItem(
      `avs.sessionKey.v1.${targetProgram.toBase58()}.${authority.toBase58()}`,
      JSON.stringify(session),
    );
    expect(loadSession(targetProgram, authority)).toEqual(session);
  });

  it("returns null for malformed stored JSON instead of throwing", () => {
    window.localStorage.setItem(
      `avs.sessionKey.v1.${targetProgram.toBase58()}.${authority.toBase58()}`,
      "{not valid json",
    );
    expect(loadSession(targetProgram, authority)).toBeNull();
  });

  it("clearSession removes only the matching (program, authority) entry", () => {
    const otherAuthority = Keypair.generate().publicKey;
    const key = (auth: PublicKey) =>
      `avs.sessionKey.v1.${targetProgram.toBase58()}.${auth.toBase58()}`;
    window.localStorage.setItem(key(authority), JSON.stringify(makeSession()));
    window.localStorage.setItem(key(otherAuthority), JSON.stringify(makeSession()));

    clearSession(targetProgram, authority);

    expect(loadSession(targetProgram, authority)).toBeNull();
    expect(loadSession(targetProgram, otherAuthority)).not.toBeNull();
  });
});

describe("isSessionValid", () => {
  it("rejects null", () => {
    expect(isSessionValid(null)).toBe(false);
  });

  it("rejects an expired session", () => {
    expect(isSessionValid(makeSession({ validUntil: Math.floor(Date.now() / 1000) - 10 }))).toBe(false);
  });

  it("accepts a not-yet-expired session", () => {
    expect(isSessionValid(makeSession({ validUntil: Math.floor(Date.now() / 1000) + 60 }))).toBe(true);
  });
});

describe("sessionKeypairFrom", () => {
  it("reconstructs the exact keypair that was stored", () => {
    const original = Keypair.generate();
    const reconstructed = sessionKeypairFrom(makeSession({ secretKey: Array.from(original.secretKey) }));
    expect(reconstructed.publicKey.equals(original.publicKey)).toBe(true);
  });
});

describe("sessionTokenPda", () => {
  const targetProgram = Keypair.generate().publicKey;
  const authority = Keypair.generate().publicKey;

  it("is deterministic for the same inputs", () => {
    const signer = Keypair.generate().publicKey;
    expect(sessionTokenPda(targetProgram, signer, authority).equals(sessionTokenPda(targetProgram, signer, authority))).toBe(
      true,
    );
  });

  it("differs when the session signer differs", () => {
    const signerA = Keypair.generate().publicKey;
    const signerB = Keypair.generate().publicKey;
    expect(
      sessionTokenPda(targetProgram, signerA, authority).equals(sessionTokenPda(targetProgram, signerB, authority)),
    ).toBe(false);
  });

  it("differs when the authority differs", () => {
    const signer = Keypair.generate().publicKey;
    const authorityB = Keypair.generate().publicKey;
    expect(
      sessionTokenPda(targetProgram, signer, authority).equals(sessionTokenPda(targetProgram, signer, authorityB)),
    ).toBe(false);
  });

  it("matches the known deployed session-keys program ID", () => {
    expect(SESSION_KEYS_PROGRAM_ID.toBase58()).toBe("KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5");
  });
});
