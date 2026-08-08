import { web3 } from "@coral-xyz/anchor";
import { expect } from "chai";

// Structural / IDL-shape tests — see tests/sealed-auction.ts for why these
// don't spin up a live validator on this machine.

const idl = require("../target/idl/spl_token_manager.json") as {
  address: string;
  instructions: { name: string; accounts: { name: string }[]; args: { name: string }[] }[];
  types: { name: string; type: { kind: string; fields?: { name: string }[] } }[];
  events: { name: string }[];
};

const PROGRAM_ID = new web3.PublicKey(idl.address);
const SYNDICATE_SEED = Buffer.from("syndicate");

function pda(seeds: (Buffer | Uint8Array)[], programId: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function syndicatePda(deal: web3.PublicKey): web3.PublicKey {
  return pda([SYNDICATE_SEED, deal.toBuffer()], PROGRAM_ID);
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

describe("spl-token-manager (structural)", () => {
  it("derives a deterministic Syndicate PDA per sealed-auction deal", () => {
    const dealOne = web3.Keypair.generate().publicKey;
    const dealTwo = web3.Keypair.generate().publicKey;

    expect(syndicatePda(dealOne).equals(syndicatePda(dealTwo))).to.equal(false);
    expect(syndicatePda(dealOne).equals(syndicatePda(dealOne))).to.equal(true);
  });

  it("exposes the expected instruction surface", () => {
    const names = idl.instructions.map((ix) => ix.name).sort();
    expect(names).to.include.members([
      "create_syndicate",
      "mint_equity",
      "delegate_equity_account",
      "transfer_equity",
      "undelegate_equity_account",
    ]);
  });

  it("transfer_equity is a plain SPL transfer — identical accounts whether L1 or ER", () => {
    // The "gasless" claim rests on sending this same instruction to the ER
    // RPC against delegated accounts, not on any special account/flag here.
    // See programs/spl-token-manager/README.md.
    const accounts = findIx("transfer_equity").accounts.map((a) => a.name).sort();
    expect(accounts).to.deep.equal(["from", "payer", "to", "token_program"]);
  });

  it("Syndicate tracks mint + membership accounting", () => {
    const fields = findType("Syndicate").type.fields!.map((f) => f.name);
    expect(fields).to.include.members(["deal", "equity_mint", "member_count", "total_minted"]);
  });

  it("emits SettlementComplete on undelegate, matching AVS_100_TASKS.md's spec", () => {
    expect(idl.events.map((e) => e.name)).to.include("SettlementComplete");
  });

  describe("live devnet e2e (skipped — needs a funded devnet wallet)", () => {
    it("full lifecycle: create syndicate -> mint -> delegate -> gasless transfer -> settle", function () {
      this.skip();
    });
  });
});
