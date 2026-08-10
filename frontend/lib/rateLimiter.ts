/**
 * Lightweight in-memory per-IP rate limiter for public API routes
 * (faucet, relay). Devnet tokens/fees are worthless, so this isn't fraud
 * prevention — it's a courtesy limit so a stuck client, or a script cycling
 * through freshly generated wallet addresses to dodge faucetServer.ts's
 * own per-recipient cooldown, can't drain the sponsor/faucet keypairs' SOL
 * float in a burst (see docs/RELAY.md's "Known limitations" — the relay
 * previously had none at all).
 *
 * In-memory means it resets on redeploy and doesn't share state across
 * serverless instances — acceptable for a hackathon devnet demo, not a
 * substitute for a real store (Upstash/Redis) in a production deployment.
 */

export class RateLimitedError extends Error {}

const requestLog = new Map<string, number[]>();

export function checkIpRateLimit(ip: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    const retryAfterMs = windowMs - (now - timestamps[0]);
    throw new RateLimitedError(`Too many requests from this address — try again in ${Math.ceil(retryAfterMs / 1000)}s`);
  }
  timestamps.push(now);
  requestLog.set(ip, timestamps);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
