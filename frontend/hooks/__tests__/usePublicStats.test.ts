import { describe, it, expect } from "vitest";
import { anonymize } from "@/hooks/usePublicStats";

describe("anonymize (public leaderboard, Task 080)", () => {
  it("keeps only the first 4 and last 4 characters of an address", () => {
    const address = "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo";
    expect(anonymize(address)).toBe("Bycx…9YYo");
  });

  it("never leaks the full middle segment of the address", () => {
    const address = "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo";
    const result = anonymize(address);
    expect(result).not.toContain(address.slice(10, 30));
  });
});
