import { describe, expect, it } from "vitest";
import { isLowBalance, LOW_BALANCE_THRESHOLD_SOL } from "@/lib/solBalance";

describe("isLowBalance", () => {
  it("returns false while balance hasn't loaded yet (null)", () => {
    expect(isLowBalance(null)).toBe(false);
  });

  it("returns true below the threshold", () => {
    expect(isLowBalance(0)).toBe(true);
    expect(isLowBalance(LOW_BALANCE_THRESHOLD_SOL - 0.0001)).toBe(true);
  });

  it("returns false at or above the threshold", () => {
    expect(isLowBalance(LOW_BALANCE_THRESHOLD_SOL)).toBe(false);
    expect(isLowBalance(LOW_BALANCE_THRESHOLD_SOL + 1)).toBe(false);
    expect(isLowBalance(5)).toBe(false);
  });
});
