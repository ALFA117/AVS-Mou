import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isPublicKey, checkCooldown, FaucetRejectedError } from "@/lib/faucetServer";

describe("isPublicKey", () => {
  it("accepts a valid base58 pubkey", () => {
    expect(isPublicKey("Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isPublicKey("")).toBe(false);
  });

  it("rejects a string with invalid base58 characters", () => {
    expect(isPublicKey("not-a-real-pubkey-0OIl")).toBe(false);
  });

  it("rejects a string that's the wrong length to decode to 32 bytes", () => {
    expect(isPublicKey("abc")).toBe(false);
  });
});

describe("checkCooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a given key", () => {
    expect(() => checkCooldown("recipient1:mint1")).not.toThrow();
  });

  it("rejects a second request for the same key within the cooldown window", () => {
    checkCooldown("recipient2:mint1");
    expect(() => checkCooldown("recipient2:mint1")).toThrow(FaucetRejectedError);
  });

  it("allows a request for a different key even during another key's cooldown", () => {
    checkCooldown("recipient3:mint1");
    expect(() => checkCooldown("recipient3:mint2")).not.toThrow();
  });

  it("allows a repeat request once the cooldown window has elapsed", () => {
    checkCooldown("recipient4:mint1");
    vi.advanceTimersByTime(31_000);
    expect(() => checkCooldown("recipient4:mint1")).not.toThrow();
  });
});
