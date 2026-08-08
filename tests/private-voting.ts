import { BN, web3 } from "@coral-xyz/anchor";
import { expect } from "chai";

// Structural / IDL-shape tests — see tests/sealed-auction.ts for why these
// don't spin up a live validator on this machine.

const idl = require("../target/idl/private_voting.json") as {
  address: string;
  instructions: { name: string; accounts: { name: string }[]; args: { name: string }[] }[];
  types: { name: string; type: { kind: string; fields?: { name: string }[]; variants?: { name: string }[] } }[];
  events: { name: string }[];
};

const PROGRAM_ID = new web3.PublicKey(idl.address);
const MILESTONE_SEED = Buffer.from("milestone");
const VOTE_SEED = Buffer.from("vote");

function pda(seeds: (Buffer | Uint8Array)[], programId: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function milestonePda(startup: web3.PublicKey, milestoneId: BN): web3.PublicKey {
  return pda(
    [MILESTONE_SEED, startup.toBuffer(), milestoneId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  );
}

function votePda(milestone: web3.PublicKey, voter: web3.PublicKey): web3.PublicKey {
  return pda([VOTE_SEED, milestone.toBuffer(), voter.toBuffer()], PROGRAM_ID);
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

describe("private-voting (structural)", () => {
  const startup = web3.Keypair.generate();
  const voterOne = web3.Keypair.generate();
  const voterTwo = web3.Keypair.generate();
  const milestoneId = new BN(Date.now());

  it("derives distinct, deterministic PDAs for milestone and votes", () => {
    const milestone = milestonePda(startup.publicKey, milestoneId);
    const voteOne = votePda(milestone, voterOne.publicKey);
    const voteTwo = votePda(milestone, voterTwo.publicKey);

    expect(milestone.equals(web3.PublicKey.default)).to.equal(false);
    expect(voteOne.equals(voteTwo)).to.equal(false);
    expect(milestonePda(startup.publicKey, milestoneId).equals(milestone)).to.equal(true);
  });

  it("exposes the expected instruction surface, including the VRF round trip", () => {
    const names = idl.instructions.map((ix) => ix.name).sort();
    expect(names).to.include.members([
      "initialize_milestone",
      "delegate_milestone",
      "init_milestone_permission",
      "cast_vote",
      "init_vote_permission",
      "reveal_milestone",
      "request_milestone_randomness",
      "milestone_randomness_callback",
      "settle_vote",
      "undelegate_milestone",
    ]);
  });

  it("cast_vote's only sealed field is the choice — no voting_power (equal-weight MVP)", () => {
    const argNames = findIx("cast_vote").args.map((a) => a.name);
    expect(argNames).to.include("choice");
    expect(argNames).not.to.include("voting_power");
  });

  it("cast_vote accepts an optional session token and an explicit member identity", () => {
    // See docs/SESSION_KEYS.md — `member` is the real wallet this vote
    // belongs to; `voter` (the signer) may be `member` directly or a
    // session key authorized for it via `session_token`.
    const ix = findIx("cast_vote");
    const argNames = ix.args.map((a) => a.name);
    expect(argNames).to.include("member");
    const accounts = ix.accounts as { name: string; optional?: boolean }[];
    const sessionToken = accounts.find((a) => a.name === "session_token");
    expect(sessionToken, "cast_vote must accept a session_token account").to.exist;
    expect(sessionToken!.optional).to.equal(true);
  });

  it("Milestone tallies yes/no counts and gates settlement on VRF fulfillment", () => {
    const fields = findType("Milestone").type.fields!.map((f) => f.name);
    expect(fields).to.include.members([
      "yes_count",
      "no_count",
      "outcome",
      "randomness",
      "randomness_fulfilled",
      "reward_pool",
    ]);
  });

  it("Outcome covers all four tally results including a tie", () => {
    const variants = findType("Outcome").type.variants!.map((v) => v.name);
    expect(variants).to.deep.equal(["Pending", "Yes", "No", "Tie"]);
  });

  it("emits VoteCast without the choice (sealed until reveal)", () => {
    const fields = findType("VoteCast").type.fields!.map((f) => f.name);
    expect(fields).to.include("voter_index");
    expect(fields).not.to.include("choice");
  });

  it("emits VoteSettled with the reward outcome, not the raw ballot", () => {
    const fields = findType("VoteSettled").type.fields!.map((f) => f.name);
    expect(fields).to.include.members(["voted_correctly", "reward_paid"]);
  });

  describe("live devnet e2e (skipped — needs a funded devnet wallet + VRF oracle queue)", () => {
    it("full milestone lifecycle: propose -> vote -> reveal -> VRF -> settle -> undelegate", function () {
      this.skip();
    });
  });
});
