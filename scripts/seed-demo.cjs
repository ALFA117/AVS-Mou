#!/usr/bin/env node
/**
 * Re-seed the public demo on Solana DEVNET: open deals someone can bid on
 * and open milestones someone can vote on. Demo deals expire, and once
 * every deadline has passed nobody visiting the site can try the flow.
 *
 * What it creates (same instructions the web app sends, see
 * frontend/app/deals/new/page.tsx and components/CreateMilestoneForm.tsx):
 *   - per deal: a fresh 6-decimal test mint whose mint authority is the
 *     site's faucet PUBLIC key (so /api/faucet can mint it to visitors),
 *     initialize_deal + delegate_deal on L1, init_deal_permission on the TEE;
 *   - per milestone: initialize_milestone + delegate_milestone on L1,
 *     init_milestone_permission on the TEE.
 *
 * Devnet only. Costs ~0.06 devnet SOL from the startup wallet.
 *
 * Usage (from the repo root, after `npm install`):
 *   node scripts/seed-demo.cjs                 # 3 deals + 2 milestones
 *   node scripts/seed-demo.cjs --dry-run       # print the plan, send nothing
 * Env:
 *   STARTUP_KEYPAIR  path to the startup wallet JSON (default ~/.config/solana/id.json)
 *   FAUCET_PUBKEY    faucet authority public key (default: the deployed faucet's)
 *   RPC_URL          devnet RPC (default https://api.devnet.solana.com)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const {
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const anchor = require("@coral-xyz/anchor");
const sdk = require("@magicblock-labs/ephemeral-rollups-sdk");
const nacl = require("tweetnacl");

const { BN } = anchor;
const IDL_DIR = path.join(__dirname, "..", "frontend", "lib", "idl");
const saIdl = JSON.parse(fs.readFileSync(path.join(IDL_DIR, "sealed_auction.json"), "utf8"));
const pvIdl = JSON.parse(fs.readFileSync(path.join(IDL_DIR, "private_voting.json"), "utf8"));

const EPH_SPL = new PublicKey("SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2");
const DELEGATION = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const ER_VALIDATOR = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
const TEE = "https://devnet-tee.magicblock.app";
const FAUCET_PUBKEY = new PublicKey(process.env.FAUCET_PUBKEY || "62mcy2c8GVd1tU6FKstyVauVePRcJUjnMmWFUfmzvnUb");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR = process.env.STARTUP_KEYPAIR || path.join(os.homedir(), ".config", "solana", "id.json");
const DRY_RUN = process.argv.includes("--dry-run");
const DAY = 86_400;
const SCALE = 1_000_000; // 6 decimals — BidForm and formatTokenAmount assume it

// Deadlines are relative to now so a re-run always yields live demos.
const DEALS = [
  { key: "A", valuation: 2_000_000, equityPct: 8, min: 100, cap: 50_000, cliff: 6, vesting: 24, days: 110 },
  { key: "B", valuation: 5_000_000, equityPct: 5, min: 250, cap: 100_000, cliff: 12, vesting: 36, days: 200 },
  { key: "C", valuation: 800_000, equityPct: 12, min: 50, cap: 25_000, cliff: 0, vesting: 12, days: 365 },
];
const MILESTONES = [
  { deal: "A", desc: "Ship the public beta to 100 pilot users", days: 80, rewardSol: 0.01 },
  { deal: "C", desc: "Close the first paying customer contract", days: 235, rewardSol: 0.01 },
];

const u64 = (n) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const startup = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, "utf8"))));
  const wallet = {
    publicKey: startup.publicKey,
    signTransaction: async (tx) => (tx.partialSign(startup), tx),
    signAllTransactions: async (txs) => txs.map((tx) => (tx.partialSign(startup), tx)),
  };
  const l1 = new Connection(RPC_URL, "confirmed");
  const now = Math.floor(Date.now() / 1000);
  console.log(`startup ${startup.publicKey.toBase58()} — ${(await l1.getBalance(startup.publicKey)) / LAMPORTS_PER_SOL} SOL`);
  console.log(`faucet authority for new mints: ${FAUCET_PUBKEY.toBase58()}`);
  if (DRY_RUN) {
    for (const d of DEALS) console.log(`deal ${d.key}: min ${d.min}, cap ${d.cap}, closes ${new Date((now + d.days * DAY) * 1000).toISOString()}`);
    for (const m of MILESTONES) console.log(`milestone on ${m.deal}: "${m.desc}", closes ${new Date((now + m.days * DAY) * 1000).toISOString()}`);
    return;
  }

  await sdk.verifyTeeRpcIntegrity(TEE);
  const { token } = await sdk.getAuthToken(TEE, startup.publicKey, async (m) => nacl.sign.detached(m, startup.secretKey));
  const er = new Connection(`${TEE}?token=${token}`, "confirmed");
  const sendEr = async (tx) => {
    tx.feePayer = startup.publicKey;
    tx.recentBlockhash = (await er.getLatestBlockhash("confirmed")).blockhash;
    tx.sign(startup);
    const sig = await er.sendRawTransaction(tx.serialize());
    const st = await er.confirmTransaction(sig, "confirmed");
    if (st.value.err) throw new Error(`ER tx failed: ${JSON.stringify(st.value.err)}`);
    return sig;
  };
  const provider = (c) => new anchor.AnchorProvider(c, wallet, { commitment: "confirmed" });
  const sa = new anchor.Program(saIdl, provider(l1));
  const saEr = new anchor.Program(saIdl, provider(er));
  const pv = new anchor.Program(pvIdl, provider(l1));
  const pvEr = new anchor.Program(pvIdl, provider(er));

  const dealsByKey = {};
  for (const d of DEALS) {
    const mint = await createMint(l1, startup, FAUCET_PUBKEY, null, 6);
    const dealId = new BN(Date.now());
    const deal = PublicKey.findProgramAddressSync([Buffer.from("deal"), startup.publicKey.toBuffer(), u64(dealId.toString())], sa.programId)[0];
    const [eata] = sdk.deriveEphemeralAta(deal, mint);
    const initIx = await sa.methods
      .initializeDeal(dealId, new BN(d.valuation * SCALE), Math.round(d.equityPct * 100), new BN(d.min * SCALE), new BN(d.cap * SCALE), new BN(now + d.days * DAY), d.cliff, d.vesting, new BN(1_000_000))
      .accountsPartial({
        startup: startup.publicKey,
        fundingMint: mint,
        deal,
        dealFundingAccount: getAssociatedTokenAddressSync(mint, deal, true),
        dealFundingEphemeralAta: eata,
        dealFundingEataBuffer: PublicKey.findProgramAddressSync([Buffer.from("buffer"), eata.toBuffer()], EPH_SPL)[0],
        dealFundingEataRecord: PublicKey.findProgramAddressSync([Buffer.from("delegation"), eata.toBuffer()], DELEGATION)[0],
        dealFundingEataMetadata: PublicKey.findProgramAddressSync([Buffer.from("delegation-metadata"), eata.toBuffer()], DELEGATION)[0],
        ephemeralTokenProgram: EPH_SPL,
        delegationProgram: DELEGATION,
        validator: ER_VALIDATOR,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    const delegateIx = await sa.methods.delegateDeal(dealId).accountsPartial({ startup: startup.publicKey, deal, validator: ER_VALIDATOR }).instruction();
    await sendAndConfirmTransaction(l1, new Transaction().add(initIx, delegateIx), [startup], { commitment: "confirmed" });
    await sleep(4000); // let the delegation propagate before the TEE sees it
    await sendEr(
      await saEr.methods
        .initDealPermission(dealId)
        .accountsPartial({
          startup: startup.publicKey,
          deal,
          permission: sdk.permissionPdaFromAccount(deal),
          permissionProgram: sdk.PERMISSION_PROGRAM_ID,
          ephemeralVault: sdk.EPHEMERAL_VAULT_ID,
          magicProgram: sdk.MAGIC_PROGRAM_ID,
        })
        .transaction(),
    );
    dealsByKey[d.key] = deal;
    console.log(`deal ${d.key}: ${deal.toBase58()} (mint ${mint.toBase58()})`);
  }

  for (const m of MILESTONES) {
    const milestoneId = new BN(Date.now());
    const milestone = PublicKey.findProgramAddressSync([Buffer.from("milestone"), startup.publicKey.toBuffer(), u64(milestoneId.toString())], pv.programId)[0];
    const hash = Array.from(crypto.createHash("sha256").update(m.desc).digest());
    const initIx = await pv.methods
      .initializeMilestone(milestoneId, dealsByKey[m.deal], hash, new BN(now + m.days * DAY), new BN(Math.round(m.rewardSol * LAMPORTS_PER_SOL)), new BN(1_000_000))
      .accountsPartial({ startup: startup.publicKey, milestone, systemProgram: SystemProgram.programId })
      .instruction();
    const delegateIx = await pv.methods.delegateMilestone(milestoneId).accountsPartial({ startup: startup.publicKey, milestone, validator: ER_VALIDATOR }).instruction();
    await sendAndConfirmTransaction(l1, new Transaction().add(initIx, delegateIx), [startup], { commitment: "confirmed" });
    await sleep(4000);
    await sendEr(
      await pvEr.methods
        .initMilestonePermission(milestoneId)
        .accountsPartial({
          startup: startup.publicKey,
          milestone,
          permission: sdk.permissionPdaFromAccount(milestone),
          permissionProgram: sdk.PERMISSION_PROGRAM_ID,
          ephemeralVault: sdk.EPHEMERAL_VAULT_ID,
          magicProgram: sdk.MAGIC_PROGRAM_ID,
        })
        .transaction(),
    );
    console.log(`milestone on deal ${m.deal}: ${milestone.toBase58()}`);
  }
  console.log(`done — ${(await l1.getBalance(startup.publicKey)) / LAMPORTS_PER_SOL} SOL left`);
}

main().catch((err) => {
  console.error("seed failed:", err && err.message ? err.message : err);
  if (err && err.logs) console.error(err.logs.join("\n"));
  process.exit(1);
});
