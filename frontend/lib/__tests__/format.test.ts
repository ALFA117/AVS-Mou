import { describe, it, expect } from "vitest";
import {
  formatTokenAmount,
  formatBps,
  formatEquity,
  formatCountdown,
  shortenAddress,
} from "@/lib/format";

describe("formatTokenAmount", () => {
  it("divides by the funding decimals (6) by default", () => {
    expect(formatTokenAmount("1000000")).toBe("1");
  });

  it("respects a custom decimals argument", () => {
    expect(formatTokenAmount("1000000000", 9)).toBe("1");
  });
});

describe("formatBps", () => {
  it("converts basis points to a percentage string", () => {
    expect(formatBps(1000)).toBe("10.00%");
    expect(formatBps(10000)).toBe("100.00%");
  });
});

describe("formatEquity", () => {
  it("computes share of the fixed total equity supply", () => {
    // 1% of a 1,000,000,000,000-unit supply
    expect(formatEquity(10_000_000_000)).toBe("1.0000%");
  });
});

describe("formatCountdown", () => {
  it("returns 'Closed' once the deadline has passed", () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 10;
    expect(formatCountdown(pastDeadline)).toBe("Closed");
  });

  it("renders days/hours/minutes for a far-future deadline", () => {
    // Round `now` down to a whole second first so `deadline - now` is
    // exactly 2d3h — otherwise the leftover sub-second remainder rounds
    // formatCountdown's minutes down by one (e.g. "2d 2h 59m").
    const now = Math.floor(Date.now() / 1000) * 1000;
    const deadline = now / 1000 + 2 * 86400 + 3 * 3600;
    expect(formatCountdown(deadline, now)).toMatch(/^2d 3h/);
  });

  it("renders minutes/seconds once under an hour remains", () => {
    const now = Date.now();
    const deadline = Math.floor(now / 1000) + 90;
    expect(formatCountdown(deadline, now)).toMatch(/^1m/);
  });
});

describe("shortenAddress", () => {
  it("truncates long addresses with an ellipsis", () => {
    const address = "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo";
    expect(shortenAddress(address)).toBe("Bycx...9YYo");
  });

  it("leaves short strings untouched", () => {
    expect(shortenAddress("abc")).toBe("abc");
  });
});
