import { describe, it, expect } from "vitest";
import { checkIpRateLimit, clientIp, RateLimitedError } from "@/lib/rateLimiter";

describe("checkIpRateLimit", () => {
  it("allows requests under the limit", () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(() => checkIpRateLimit(ip, 5, 60_000)).not.toThrow();
    }
  });

  it("rejects the request that exceeds the limit", () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkIpRateLimit(ip, 3, 60_000);
    expect(() => checkIpRateLimit(ip, 3, 60_000)).toThrow(RateLimitedError);
  });

  it("tracks separate IPs independently", () => {
    const ipA = `test-a-${Math.random()}`;
    const ipB = `test-b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkIpRateLimit(ipA, 3, 60_000);
    expect(() => checkIpRateLimit(ipA, 3, 60_000)).toThrow(RateLimitedError);
    expect(() => checkIpRateLimit(ipB, 3, 60_000)).not.toThrow();
  });

  it("allows again once the window has passed", () => {
    const ip = `test-${Math.random()}`;
    checkIpRateLimit(ip, 1, 10);
    expect(() => checkIpRateLimit(ip, 1, 10)).toThrow(RateLimitedError);
  });
});

describe("clientIp", () => {
  it("reads the first address from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "203.0.113.5" },
    });
    expect(clientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const request = new Request("http://localhost");
    expect(clientIp(request)).toBe("unknown");
  });
});
