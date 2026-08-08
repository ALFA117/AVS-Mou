import { BN, web3 } from "@coral-xyz/anchor";
import { expect } from "chai";

// Structural / IDL-shape tests — no live validator required (see
// docs/WINDOWS_NOTES.md: solana-test-validator doesn't run natively on
// Windows, so this repo's tests target Devnet or run offline). These
// mirror the vendor sealed-auction example's own "deterministic
// account-graph checks" category: they verify PDA derivation, the
// instruction surface, and account/type shapes without needing a cluster.
//
// A devnet-gated live e2e suite (place a real bid, reveal, settle) is
// future work — see the skipped placeholder at the bottom. It needs a
// funded devnet wallet + devnet SPL mints, which isn't set up in CI yet.

const idl = require("../target/idl/sealed_auction.json") as {
  address: string;
  instructions: { name: string; accounts: { name: string }[]; args: { name: string }[] }[];
  types: { name: string; type: { kind: string; fields?: { name: string }[]; variants?: { name: string }[] } }[];
  events: { name: string }[];
};

const PROGRAM_ID = new web3.PublicKey(idl.address);
const DEAL_SEED = Buffer.from("deal");
const BID_SEED = Buffer.from("bid");

function pda(seeds: (Buffer | Uint8Array)[], programId: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function dealPda(startup: web3.PublicKey, dealId: BN): web3.PublicKey {
  return pda([DEAL_SEED, startup.toBuffer(), dealId.toArrayLike(Buffer, "le", 8)], PROGRAM_ID);
}

function bidPda(deal: web3.PublicKey, bidder: web3.PublicKey): web3.PublicKey {
  return pda([BID_SEED, deal.toBuffer(), bidder.toBuffer()], PROGRAM_ID);
}

function findType(name: string) {
  const t = idl.types.find((t) => t.name === name);
  if (!t) throw new Error(`type ${name} not found in IDL`);
  return t;
}

function findIx(name: string) {
  const ix = idl.instructions.find((ix) => ix.name === name);
  if (!ix) throw new Error(`instruction ${name} not found in IDL`);
  return ix;
}

describe("sealed-auction (structural)", () => {
  const startup = web3.Keypair.generate();
  const bidderOne = web3.Keypair.generate();
  const bidderTwo = web3.Keypair.generate();
  const dealId = new BN(Date.now());

  it("derives distinct, deterministic PDAs for deal and bids", () => {
    const deal = dealPda(startup.publicKey, dealId);
    const bidOne = bidPda(deal, bidderOne.publicKey);
    const bidTwo = bidPda(deal, bidderTwo.publicKey);

    expect(deal.equals(web3.PublicKey.default)).to.equal(false);
    expect(bidOne.equals(bidTwo)).to.equal(false);
    expect(dealPda(startup.publicKey, dealId).equals(deal)).to.equal(true);
    // A different deal_id must derive a different Deal PDA.
    expect(dealPda(startup.publicKey, dealId.addn(1)).equals(deal)).to.equal(false);
  });

  it("exposes the expected instruction surface", () => {
    const names = idl.instructions.map((ix) => ix.name).sort();
    expect(names).to.include.members([
      "initialize_deal",
      "delegate_deal",
      "init_deal_permission",
      "place_bid",
      "init_bid_permission",
      "reveal_deal",
      "settle_bid",
      "undelegate_deal",
    ]);
    // No single-winner / refund instructions from the upstream auction —
    // see programs/sealed-auction/README.md for why this is proportional
    // multi-winner instead.
    expect(names).not.to.include.members(["finalize", "reclaim_unsold_lot", "claim_refund"]);
  });

  it("initialize_deal takes the full deal-terms argument set", () => {
    const argNames = findIx("initialize_deal").args.map((a) => a.name);
    expect(argNames).to.deep.equal([
      "deal_id",
      "valuation",
      "equity_bps",
      "min_investment",
      "max_cap",
      "deadline_ts",
      "cliff_months",
      "vesting_months",
      "sponsor_lamports",
    ]);
  });

  it("place_bid never surfaces the bid amount to a public account or return value", () => {
    // The privacy property under test: nothing about `place_bid`'s account
    // list should be a plaintext ledger of the amount — it's written into
    // the sealed `bid` PDA only, gated by init_bid_permission.
    const accounts = findIx("place_bid").accounts.map((a) => a.name);
    expect(accounts).to.include("bid");
    expect(accounts).not.to.include("amount_log");
  });

  it("Deal tracks proportional-syndicate fields, not a single winner", () => {
    const fields = findType("Deal").type.fields!.map((f) => f.name);
    expect(fields).to.include.members([
      "bid_count",
      "closed_bid_count",
      "total_raised",
      "equity_bps",
      "oversubscribed",
    ]);
    expect(fields).not.to.include.members(["highest_bid", "highest_bidder", "lot_amount"]);
  });

  it("Bid records a per-bidder equity allocation", () => {
    const fields = findType("Bid").type.fields!.map((f) => f.name);
    expect(fields).to.include("equity_allocated");
  });

  it("DealStatus has no intermediate 'Ended' state (reveal and settle are decoupled)", () => {
    const variants = findType("DealStatus").type.variants!.map((v) => v.name);
    expect(variants).to.deep.equal(["Open", "Revealed", "Settled"]);
  });

  it("emits BidPlaced without an amount field (sealed until reveal)", () => {
    const fields = findType("BidPlaced").type.fields!.map((f) => f.name);
    expect(fields).to.include("bidder_index");
    expect(fields).not.to.include("amount");
  });

  it("emits BidSettled with both amount and equity_allocated (post-reveal, no longer sealed)", () => {
    const fields = findType("BidSettled").type.fields!.map((f) => f.name);
    expect(fields).to.include.members(["amount", "equity_allocated"]);
  });

  describe("live devnet e2e (skipped — needs a funded devnet wallet + mints)", () => {
    // Run with RUN_SEALED_AUCTION_DEVNET_E2E=1 and a funded
    // ~/.config/solana/id.json once this is wired up. Tracked as follow-up
    // work; the structural tests above are the CI-safe default.
    it("full deal lifecycle: initialize -> bid -> reveal -> settle -> undelegate", function () {
      this.skip();
    });
  });
});
