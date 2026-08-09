import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DealCharts } from "@/components/DealCharts";
import type { Bid, Deal } from "@/lib/types";

const baseDeal: Deal = {
  publicKey: "DeaLPubkey11111111111111111111111111111111",
  startup: "StartUpPubkey1111111111111111111111111111",
  dealId: "7",
  fundingMint: "FundMint111111111111111111111111111111111",
  valuation: "10000000000",
  equityBps: 1500,
  minInvestment: "1000000",
  maxCap: "50000000",
  deadlineTs: Math.floor(Date.now() / 1000) - 3600,
  bidCount: 2,
  closedBidCount: 0,
  totalRaised: "30000000",
  status: "revealed",
  oversubscribed: false,
  cliffMonths: 6,
  vestingMonths: 24,
};

const bid: Bid = {
  publicKey: "BidPubkey111111111111111111111111111111111",
  deal: baseDeal.publicKey,
  bidder: "BidderPubkey11111111111111111111111111111",
  amount: "30000000",
  bidderIndex: 0,
  escrow: "EscrowPubkey1111111111111111111111111111",
  equityAllocated: "500000",
};

describe("DealCharts", () => {
  it("hides bid amounts while the deal is still open — sealed until reveal", () => {
    render(<DealCharts deal={{ ...baseDeal, status: "open" }} bids={[]} />);
    expect(screen.getByText("Hidden until reveal")).toBeTruthy();
  });

  it("shows a bar-chart section once revealed with bids present", () => {
    render(<DealCharts deal={baseDeal} bids={[bid]} />);
    expect(screen.getByText("Top bid amounts")).toBeTruthy();
    expect(screen.queryByText("Hidden until reveal")).toBeFalsy();
  });

  it("explains settled bids instead of showing a blank chart once bids are closed", () => {
    // settle_bid closes each Bid account after paying out — a settled deal
    // legitimately has zero Bid accounts left, which isn't a bug.
    render(<DealCharts deal={{ ...baseDeal, status: "settled" }} bids={[]} />);
    expect(screen.getByText("All bids settled — funds already paid out to the startup.")).toBeTruthy();
  });
});
