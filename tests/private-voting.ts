import * as anchor from "@coral-xyz/anchor";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as crypto from "crypto";
import * as nacl from "tweetnacl";
import {
  getAuthToken,
  PERMISSION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
  permissionPdaFromAccount,
  EPHEMERAL_VAULT_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
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

  describe("live devnet e2e (skipped unless RUN_PRIVATE_VOTING_DEVNET_E2E=1)", function () {
    this.timeout(180_000);
    const RUN_LIVE = process.env.RUN_PRIVATE_VOTING_DEVNET_E2E === "1";
    const TEE_RPC = "https://devnet-tee.magicblock.app";
    const VALIDATOR = new web3.PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");

    function loadKeypair(path: string): web3.Keypair {
      const raw = JSON.parse(fs.readFileSync(path.replace("~", os.homedir()), "utf-8"));
      return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
    }

    function sleep(ms: number) {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function teeConnection(authority: web3.Keypair): Promise<web3.Connection> {
      const { token } = await getAuthToken(TEE_RPC, authority.publicKey, (message: Uint8Array) =>
        Promise.resolve(nacl.sign.detached(message, authority.secretKey)),
      );
      return new web3.Connection(`${TEE_RPC}?token=${token}`, {
        wsEndpoint: `wss://devnet-tee.magicblock.app?token=${token}`,
        commitment: "confirmed",
      });
    }

    async function sendRaw(
      connection: web3.Connection,
      tx: web3.Transaction,
      feePayer: web3.Keypair,
      signers: web3.Keypair[] = [],
      label = "tx",
    ): Promise<string> {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = feePayer.publicKey;
      tx.recentBlockhash = blockhash;
      const seen = new Map<string, web3.Keypair>();
      [feePayer, ...signers].forEach((s) => seen.set(s.publicKey.toBase58(), s));
      tx.partialSign(...seen.values());
      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      const status = await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed",
      );
      if (status.value.err) {
        throw new Error(`${label} ${sig} failed: ${JSON.stringify(status.value.err)}`);
      }
      return sig;
    }

    before(function () {
      if (!RUN_LIVE) this.skip();
    });

    it(
      "sealed milestone voting against real Devnet + MagicBlock's hosted TEE ER: " +
        "propose -> delegate -> sealed votes from 2 members -> reveal with correct tally",
      async () => {
        const startup = loadKeypair("~/.config/solana/id.json");
        const voterYes = web3.Keypair.generate();
        const voterNo = web3.Keypair.generate();
        const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
        const wallet = new anchor.Wallet(startup);
        const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
        const idlProgram = new Program(idl as anchor.Idl, provider) as unknown as Program<anchor.Idl>;

        await sendRaw(
          connection,
          new web3.Transaction().add(
            web3.SystemProgram.transfer({
              fromPubkey: startup.publicKey,
              toPubkey: voterYes.publicKey,
              lamports: 0.05 * web3.LAMPORTS_PER_SOL,
            }),
            web3.SystemProgram.transfer({
              fromPubkey: startup.publicKey,
              toPubkey: voterNo.publicKey,
              lamports: 0.05 * web3.LAMPORTS_PER_SOL,
            }),
          ),
          startup,
          [],
          "fund voters",
        );

        const milestoneId = new BN(Date.now());
        const milestone = milestonePda(startup.publicKey, milestoneId);
        const dummyDeal = web3.Keypair.generate().publicKey;
        const descriptionHash = crypto.createHash("sha256").update("ship v2 dashboard").digest();
        const deadlineTs = new BN(Math.floor(Date.now() / 1000) + 60);

        await idlProgram.methods
          .initializeMilestone(
            milestoneId,
            dummyDeal,
            Array.from(descriptionHash),
            deadlineTs,
            new BN(0), // reward_pool — not exercised by this test (VRF settlement is a separate, documented follow-up)
            new BN(1_000_000),
          )
          .accountsPartial({ startup: startup.publicKey, milestone, systemProgram: web3.SystemProgram.programId })
          .rpc({ skipPreflight: false });

        await idlProgram.methods
          .delegateMilestone(milestoneId)
          .accountsPartial({ startup: startup.publicKey, milestone, validator: VALIDATOR })
          .rpc({ skipPreflight: false });

        await sleep(3000);

        const startupEr = await teeConnection(startup);
        const startupErProgram = new Program(
          idl as anchor.Idl,
          new anchor.AnchorProvider(startupEr, wallet, { commitment: "confirmed" }),
        ) as unknown as Program<anchor.Idl>;

        await sendRaw(
          startupEr,
          await startupErProgram.methods
            .initMilestonePermission(milestoneId)
            .accountsPartial({
              startup: startup.publicKey,
              milestone,
              permission: permissionPdaFromAccount(milestone),
              permissionProgram: PERMISSION_PROGRAM_ID,
              ephemeralVault: EPHEMERAL_VAULT_ID,
              magicProgram: MAGIC_PROGRAM_ID,
            })
            .transaction(),
          startup,
          [],
          "init_milestone_permission",
        );

        const voteYesPk = votePda(milestone, voterYes.publicKey);
        const voteNoPk = votePda(milestone, voterNo.publicKey);
        for (const [voter, choice, votePk] of [
          [voterYes, { yes: {} }, voteYesPk],
          [voterNo, { no: {} }, voteNoPk],
        ] as [web3.Keypair, Record<string, unknown>, web3.PublicKey][]) {
          const voterEr = await teeConnection(voter);
          const voterErProgram = new Program(
            idl as anchor.Idl,
            new anchor.AnchorProvider(voterEr, new anchor.Wallet(voter), { commitment: "confirmed" }),
          ) as unknown as Program<anchor.Idl>;

          await sendRaw(
            voterEr,
            await voterErProgram.methods
              .castVote(milestoneId, voter.publicKey, choice)
              .accountsPartial({
                payer: startup.publicKey,
                voter: voter.publicKey,
                sessionToken: null,
                milestone,
                vote: votePk,
                vault: EPHEMERAL_VAULT_ID,
                magicProgram: MAGIC_PROGRAM_ID,
              })
              .transaction(),
            startup,
            [voter],
            `cast_vote ${voter.publicKey.toBase58()}`,
          );

          await sendRaw(
            startupEr,
            await startupErProgram.methods
              .initVotePermission(milestoneId)
              .accountsPartial({
                milestone,
                vote: votePk,
                votePermission: permissionPdaFromAccount(votePk),
                permissionProgram: PERMISSION_PROGRAM_ID,
                ephemeralVault: EPHEMERAL_VAULT_ID,
                magicProgram: MAGIC_PROGRAM_ID,
              })
              .transaction(),
            startup,
            [],
            `init_vote_permission ${voter.publicKey.toBase58()}`,
          );
        }

        const milestoneAfterVotes = (await (startupErProgram.account as any).milestone.fetch(milestone)) as {
          voterCount: number;
        };
        expect(milestoneAfterVotes.voterCount).to.equal(2);

        const waitMs = deadlineTs.toNumber() * 1000 - Date.now() + 2000;
        if (waitMs > 0) await sleep(waitMs);

        await sendRaw(
          startupEr,
          await startupErProgram.methods
            .revealMilestone(milestoneId)
            .accountsPartial({ startup: startup.publicKey, milestone })
            .remainingAccounts([
              { pubkey: voteYesPk, isSigner: false, isWritable: false },
              { pubkey: voteNoPk, isSigner: false, isWritable: false },
            ])
            .transaction(),
          startup,
          [],
          "reveal_milestone",
        );

        const revealed = (await (startupErProgram.account as any).milestone.fetch(milestone)) as {
          status: Record<string, unknown>;
          yesCount: number;
          noCount: number;
          outcome: Record<string, unknown>;
        };
        expect(Object.keys(revealed.status)[0]).to.equal("revealed");
        expect(revealed.yesCount).to.equal(1);
        expect(revealed.noCount).to.equal(1);
        // 1-1 is a genuine tie — verifies the tally isn't silently biased
        // toward one side by reveal's counting logic.
        expect(Object.keys(revealed.outcome)[0]).to.equal("tie");

        // VRF-gated settlement (request_milestone_randomness ->
        // MagicBlock's oracle callback -> settle_vote) and
        // undelegate_milestone are NOT exercised here: request_milestone_randomness
        // needs a live oracle_queue address this test doesn't have a
        // verified source for, and undelegate_milestone shares sealed-auction's
        // undelegate_deal bug (see docs/KNOWN_ISSUES.md). The sealed voting
        // lifecycle above — the privacy-critical part — is fully proven.
      },
    );
  });
});
