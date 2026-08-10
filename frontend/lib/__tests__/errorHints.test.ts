import { describe, expect, it } from "vitest";
import { describeError, isLikelyNetworkMismatch } from "@/lib/errorHints";

describe("isLikelyNetworkMismatch", () => {
  it("matches known network-mismatch phrasings", () => {
    expect(isLikelyNetworkMismatch("Transaction reverted during simulation")).toBe(true);
    expect(isLikelyNetworkMismatch("User rejected the request")).toBe(true);
    expect(isLikelyNetworkMismatch("Simulation failed")).toBe(true);
  });

  it("does not match unrelated messages", () => {
    expect(isLikelyNetworkMismatch("Insufficient funds")).toBe(false);
  });
});

describe("describeError", () => {
  it("unwraps a WalletError-shaped nested Error", () => {
    const inner = new Error("Attempt to debit an account but found no record of a prior credit.");
    const outer = Object.assign(new Error("Unexpected error"), { error: inner });
    expect(describeError(outer)).toBe(inner.message);
  });

  it("unwraps a nested object with program logs", () => {
    const outer = Object.assign(new Error("Unexpected error"), {
      error: { logs: ["Program log: custom program error: 0x1771", "Program failed to complete"] },
    });
    expect(describeError(outer)).toBe(
      "Unexpected error: Program log: custom program error: 0x1771 | Program failed to complete",
    );
  });

  it("unwraps a nested object with a plain message field", () => {
    const outer = Object.assign(new Error("Unexpected error"), { error: { message: "blockhash not found" } });
    expect(describeError(outer)).toBe("blockhash not found");
  });

  it("falls back to the outer message when there's no usable nested error", () => {
    const outer = new Error("Plain failure");
    expect(describeError(outer)).toBe("Plain failure");
  });

  it("falls back to String() for non-Error throws", () => {
    expect(describeError("just a string")).toBe("just a string");
    expect(describeError(42)).toBe("42");
  });
});
