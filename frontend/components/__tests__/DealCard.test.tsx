import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DealCard } from "@/components/DealCard";
import type { Deal } from "@/lib/types";

const baseDeal: Deal = {
  publicKey: "DeaLPubkey11111111111111111111111111111111",
  startup: "StartUpPubkey1111111111111111111111111111",
  dealId: "7",
  fundingMint: "FundMint111111111111111111111111111111111",
  valuation: "10000000000",
  equityBps: 1500,
  minInvestment: "1000000",
  maxCap: "50000000",
  deadlineTs: Math.floor(Date.now() / 1000) + 3600,
  bidCount: 4,
  closedBidCount: 0,
  totalRaised: "0",
  status: "open",
  oversubscribed: false,
  cliffMonths: 6,
  vestingMonths: 24,
};

describe("DealCard", () => {
  it("renders the deal id, status, and equity offered", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText("Deal #7")).toBeTruthy();
    expect(screen.getByText("open")).toBeTruthy();
    expect(screen.getByText("15.00%")).toBeTruthy();
  });

  it("shows bid count (not amount) while a deal is still open — sealed until reveal", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText("4 sealed bids")).toBeTruthy();
  });

  it("shows the raised total once a deal is settled", () => {
    render(<DealCard deal={{ ...baseDeal, status: "settled", totalRaised: "3000000" }} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("links to the deal's detail page", () => {
    render(<DealCard deal={baseDeal} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(`/deals/${baseDeal.publicKey}`);
  });
});
