import { describe, it, expect } from "vitest";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { mapDeal, mapBid, mapMilestone } from "@/lib/mappers";

describe("mapDeal", () => {
  it("converts a raw Anchor Deal account into the plain Deal type", () => {
    const publicKey = Keypair.generate().publicKey;
    const startup = Keypair.generate().publicKey;
    const fundingMint = Keypair.generate().publicKey;

    const deal = mapDeal(publicKey, {
      startup,
      dealId: new BN(42),
      fundingMint,
      valuation: new BN(1_000_000_000),
      equityBps: 1000,
      minInvestment: new BN(1_000_000),
      maxCap: new BN(100_000_000),
      deadlineTs: new BN(1_700_000_000),
      bidCount: 3,
      closedBidCount: 1,
      totalRaised: new BN(5_000_000),
      status: { open: {} },
      oversubscribed: false,
      cliffMonths: 6,
      vestingMonths: 24,
      bump: 255,
    });

    expect(deal.publicKey).toBe(publicKey.toBase58());
    expect(deal.startup).toBe(startup.toBase58());
    expect(deal.dealId).toBe("42");
    expect(deal.equityBps).toBe(1000);
    expect(deal.status).toBe("open");
    expect(deal.deadlineTs).toBe(1_700_000_000);
  });

  it("reads the active variant name off a Rust enum's discriminated object shape", () => {
    const pk = Keypair.generate().publicKey;
    const base = {
      startup: pk,
      dealId: new BN(1),
      fundingMint: pk,
      valuation: new BN(0),
      equityBps: 1,
      minInvestment: new BN(1),
      maxCap: new BN(1),
      deadlineTs: new BN(0),
      bidCount: 0,
      closedBidCount: 0,
      totalRaised: new BN(0),
      oversubscribed: false,
      cliffMonths: 0,
      vestingMonths: 0,
      bump: 0,
    };
    expect(mapDeal(pk, { ...base, status: { revealed: {} } }).status).toBe("revealed");
    expect(mapDeal(pk, { ...base, status: { settled: {} } }).status).toBe("settled");
  });
});

describe("mapBid", () => {
  it("converts a raw Anchor Bid account into the plain Bid type", () => {
    const publicKey = Keypair.generate().publicKey;
    const deal = Keypair.generate().publicKey;
    const bidder = Keypair.generate().publicKey;
    const escrow = Keypair.generate().publicKey;

    const bid = mapBid(publicKey, {
      deal,
      bidder,
      amount: new BN(2_000_000),
      bidderIndex: 0,
      escrow,
      equityAllocated: new BN(0),
      bump: 254,
    });

    expect(bid.deal).toBe(deal.toBase58());
    expect(bid.bidder).toBe(bidder.toBase58());
    expect(bid.amount).toBe("2000000");
  });
});

describe("mapMilestone", () => {
  it("hex-encodes the description hash byte array", () => {
    const pk = Keypair.generate().publicKey;
    const milestone = mapMilestone(pk, {
      startup: pk,
      deal: pk,
      milestoneId: new BN(1),
      descriptionHash: Array(32).fill(0xab) as number[],
      deadlineTs: new BN(0),
      rewardPool: new BN(0),
      voterCount: 0,
      closedVoteCount: 0,
      yesCount: 0,
      noCount: 0,
      outcome: { pending: {} },
      status: { open: {} },
      randomness: Array(32).fill(0) as number[],
      randomnessFulfilled: false,
      bump: 0,
    });
    expect(milestone.descriptionHash).toBe("ab".repeat(32));
    expect(milestone.outcome).toBe("pending");
  });
});

// Sanity check that PublicKey import above is actually exercised (avoids an
// unused-import lint failure while keeping the type-only usage obvious).
describe("test fixtures", () => {
  it("generates valid PublicKeys for fixtures", () => {
    expect(PublicKey.isOnCurve(Keypair.generate().publicKey.toBytes())).toBe(true);
  });
});
