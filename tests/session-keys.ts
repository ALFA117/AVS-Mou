import * as anchor from "@coral-xyz/anchor";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as nacl from "tweetnacl";
import {
  getAuthToken,
  PERMISSION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  permissionPdaFromAccount,
  deriveEphemeralAta,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import {
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SessionTokenManager } from "@magicblock-labs/gum-sdk";
import { expect } from "chai";

// Live security tests for the session-key mechanism shared by sealed-auction
// and private-voting (see docs/SESSION_KEYS.md). Runs against real Devnet +
// MagicBlock's hosted TEE Ephemeral Rollup, same as
// tests/sealed-auction.ts's live suite — skipped unless
// RUN_SESSION_KEY_DEVNET_E2E=1.

const idl = require("../target/idl/sealed_auction.json") as { address: string };
const PROGRAM_ID = new web3.PublicKey(idl.address);
const TEE_RPC = "https://devnet-tee.magicblock.app";
const VALIDATOR = new web3.PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
const EPHEMERAL_SPL_TOKEN_PROGRAM_ID = new web3.PublicKey(
  "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2",
);
const DELEGATION_PROGRAM_ID = new web3.PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh",
);
const SESSION_KEYS_PROGRAM_ID = new web3.PublicKey("KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5");

function loadKeypair(path: string): web3.Keypair {
  const raw = JSON.parse(fs.readFileSync(path.replace("~", os.homedir()), "utf-8"));
  return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
}

function dealPda(startup: web3.PublicKey, dealId: BN): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("deal"), startup.toBuffer(), dealId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];
}

function bidPda(deal: web3.PublicKey, bidder: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bid"), deal.toBuffer(), bidder.toBuffer()],
    PROGRAM_ID,
  )[0];
}

function sessionTokenPda(
  targetProgram: web3.PublicKey,
  sessionSigner: web3.PublicKey,
  authority: web3.PublicKey,
): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("session_token_v2"), targetProgram.toBuffer(), sessionSigner.toBuffer(), authority.toBuffer()],
    SESSION_KEYS_PROGRAM_ID,
  )[0];
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
    throw new Error(`${sig} failed: ${JSON.stringify(status.value.err)}`);
  }
  return sig;
}

describe("session-key security (live devnet e2e, skipped unless RUN_SESSION_KEY_DEVNET_E2E=1)", function () {
  this.timeout(180_000);
  const RUN_LIVE = process.env.RUN_SESSION_KEY_DEVNET_E2E === "1";

  const startup = loadKeypair("~/.config/solana/id.json");
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = new anchor.Wallet(startup);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl as anchor.Idl, provider) as unknown as Program<anchor.Idl>;

  let deal: web3.PublicKey;
  let dealId: BN;
  let fundingMint: web3.PublicKey;
  let startupEr: web3.Connection;
  let startupErProgram: Program<anchor.Idl>;

  async function createSessionFor(
    authority: web3.Keypair,
    lifetimeSeconds: number,
  ): Promise<{ sessionSigner: web3.Keypair; validUntil: number }> {
    const sessionSigner = web3.Keypair.generate();
    const manager = new SessionTokenManager(new anchor.Wallet(authority) as never, connection);
    const validUntil = Math.floor(Date.now() / 1000) + lifetimeSeconds;
    const tx = await manager.program.methods
      .createSessionV2(true, new BN(validUntil), new BN(5_000_000))
      .accounts({
        targetProgram: PROGRAM_ID,
        sessionSigner: sessionSigner.publicKey,
        feePayer: startup.publicKey,
        authority: authority.publicKey,
      })
      .transaction();
    await sendRaw(connection, tx, startup, authority.publicKey.equals(startup.publicKey) ? [] : [authority, sessionSigner]);
    return { sessionSigner, validUntil };
  }

  async function revokeSessionFor(authority: web3.Keypair, sessionSigner: web3.PublicKey): Promise<void> {
    const manager = new SessionTokenManager(new anchor.Wallet(authority) as never, connection);
    const tx = await manager.program.methods
      .revokeSessionV2()
      .accounts({
        sessionToken: sessionTokenPda(PROGRAM_ID, sessionSigner, authority.publicKey),
        feePayer: startup.publicKey,
        authority: authority.publicKey,
      })
      .transaction();
    // gpl_session's revoke_session_v2 requires `authority` to actually sign
    // (InvalidAuthority otherwise) even though its IDL's account metas (as
    // resolved by .accounts() here) don't mark it isSigner — patch the
    // instruction's own AccountMeta so the signature we add below is
    // recognized by the runtime.
    for (const ix of tx.instructions) {
      for (const key of ix.keys) {
        if (key.pubkey.equals(authority.publicKey)) key.isSigner = true;
      }
    }
    await sendRaw(connection, tx, startup, [authority]);
  }

  async function attemptPlaceBid(params: {
    investor: web3.Keypair;
    investorFundingAccount: web3.PublicKey;
    bidder: web3.Keypair;
    sessionToken: web3.PublicKey | null;
  }): Promise<void> {
    const { investor, investorFundingAccount, bidder, sessionToken } = params;
    const bidderEr = await teeConnection(bidder);
    const bidderErProgram = new Program(
      idl as anchor.Idl,
      new anchor.AnchorProvider(bidderEr, new anchor.Wallet(bidder), { commitment: "confirmed" }),
    ) as unknown as Program<anchor.Idl>;
    const bid = bidPda(deal, bidder.publicKey);
    const dealFundingAccount = getAssociatedTokenAddressSync(fundingMint, deal, true);

    const tx = await bidderErProgram.methods
      .placeBid(dealId, investor.publicKey, new BN(100))
      .accountsPartial({
        payer: startup.publicKey,
        bidder: bidder.publicKey,
        sessionToken,
        fundingMint,
        deal,
        bid,
        bidderFundingAccount: investorFundingAccount,
        dealFundingAccount,
        vault: EPHEMERAL_VAULT_ID,
        magicProgram: MAGIC_PROGRAM_ID,
      })
      .transaction();
    await sendRaw(bidderEr, tx, startup, [bidder]);
  }

  before(async function () {
    if (!RUN_LIVE) {
      this.skip();
      return;
    }

    fundingMint = await createMint(connection, startup, startup.publicKey, null, 6);
    dealId = new BN(Date.now());
    deal = dealPda(startup.publicKey, dealId);
    const dealFundingAccount = getAssociatedTokenAddressSync(fundingMint, deal, true);
    const [dealFundingEphemeralAta] = deriveEphemeralAta(deal, fundingMint);
    const eataBuffer = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("buffer"), dealFundingEphemeralAta.toBuffer()],
      EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
    )[0];
    const eataRecord = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), dealFundingEphemeralAta.toBuffer()],
      DELEGATION_PROGRAM_ID,
    )[0];
    const eataMetadata = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("delegation-metadata"), dealFundingEphemeralAta.toBuffer()],
      DELEGATION_PROGRAM_ID,
    )[0];

    await program.methods
      .initializeDeal(
        dealId,
        new BN(1_000_000),
        500,
        new BN(1),
        new BN(1_000_000),
        new BN(Math.floor(Date.now() / 1000) + 600),
        0,
        0,
        new BN(1_000_000),
      )
      .accountsPartial({
        startup: startup.publicKey,
        fundingMint,
        deal,
        dealFundingAccount,
        dealFundingEphemeralAta,
        dealFundingEataBuffer: eataBuffer,
        dealFundingEataRecord: eataRecord,
        dealFundingEataMetadata: eataMetadata,
        ephemeralTokenProgram: EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
        delegationProgram: DELEGATION_PROGRAM_ID,
        validator: VALIDATOR,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: false });

    await program.methods
      .delegateDeal(dealId)
      .accountsPartial({ startup: startup.publicKey, deal, validator: VALIDATOR })
      .rpc({ skipPreflight: false });

    await sleep(3000);

    startupEr = await teeConnection(startup);
    startupErProgram = new Program(
      idl as anchor.Idl,
      new anchor.AnchorProvider(startupEr, wallet, { commitment: "confirmed" }),
    ) as unknown as Program<anchor.Idl>;

    await sendRaw(
      startupEr,
      await startupErProgram.methods
        .initDealPermission(dealId)
        .accountsPartial({
          startup: startup.publicKey,
          deal,
          permission: permissionPdaFromAccount(deal),
          permissionProgram: PERMISSION_PROGRAM_ID,
          ephemeralVault: EPHEMERAL_VAULT_ID,
          magicProgram: MAGIC_PROGRAM_ID,
        })
        .transaction(),
      startup,
      [],
    );
  });

  it("rejects a place_bid signed with an expired session key", async () => {
    const investor = web3.Keypair.generate();
    await sendRaw(
      connection,
      new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: startup.publicKey,
          toPubkey: investor.publicKey,
          lamports: 0.02 * web3.LAMPORTS_PER_SOL,
        }),
      ),
      startup,
      [],
    );
    const investorFundingAccount = await createAssociatedTokenAccount(
      connection,
      startup,
      fundingMint,
      investor.publicKey,
    );

    const { sessionSigner } = await createSessionFor(investor, 2);
    await sleep(4000); // let it expire

    let failed = false;
    try {
      await attemptPlaceBid({
        investor,
        investorFundingAccount,
        bidder: sessionSigner,
        sessionToken: sessionTokenPda(PROGRAM_ID, sessionSigner.publicKey, investor.publicKey),
      });
    } catch (err) {
      failed = true;
      console.log("    (expired-session rejection reason):", String(err).slice(0, 200));
    }
    expect(failed, "place_bid with an expired session should have failed").to.equal(true);
  });

  it("rejects a place_bid signed with a revoked session key", async () => {
    const investor = web3.Keypair.generate();
    await sendRaw(
      connection,
      new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: startup.publicKey,
          toPubkey: investor.publicKey,
          lamports: 0.02 * web3.LAMPORTS_PER_SOL,
        }),
      ),
      startup,
      [],
    );
    const investorFundingAccount = await createAssociatedTokenAccount(
      connection,
      startup,
      fundingMint,
      investor.publicKey,
    );

    const { sessionSigner } = await createSessionFor(investor, 3600);
    await revokeSessionFor(investor, sessionSigner.publicKey);

    let failed = false;
    try {
      await attemptPlaceBid({
        investor,
        investorFundingAccount,
        bidder: sessionSigner,
        sessionToken: sessionTokenPda(PROGRAM_ID, sessionSigner.publicKey, investor.publicKey),
      });
    } catch (err) {
      failed = true;
    }
    expect(failed, "place_bid with a revoked session should have failed").to.equal(true);
  });

  it("rejects a session minted for one investor when used to bid for a different investor", async () => {
    const realInvestor = web3.Keypair.generate();
    const differentInvestor = web3.Keypair.generate();
    await sendRaw(
      connection,
      new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: startup.publicKey,
          toPubkey: realInvestor.publicKey,
          lamports: 0.02 * web3.LAMPORTS_PER_SOL,
        }),
      ),
      startup,
      [],
    );
    const differentInvestorFundingAccount = await createAssociatedTokenAccount(
      connection,
      startup,
      fundingMint,
      differentInvestor.publicKey,
    );

    // Session is legitimately authorized for realInvestor...
    const { sessionSigner } = await createSessionFor(realInvestor, 3600);

    // ...but the client tries to use it to bid on differentInvestor's
    // behalf. The session_token PDA that actually exists on-chain is seeded
    // by (program, sessionSigner, realInvestor) — passing differentInvestor
    // as the `investor` arg means the account this instruction resolves at
    // that PDA slot was never created, so it must fail.
    let failed = false;
    try {
      await attemptPlaceBid({
        investor: differentInvestor,
        investorFundingAccount: differentInvestorFundingAccount,
        bidder: sessionSigner,
        sessionToken: sessionTokenPda(PROGRAM_ID, sessionSigner.publicKey, differentInvestor.publicKey),
      });
    } catch (err) {
      failed = true;
    }
    expect(failed, "place_bid for a mismatched investor should have failed").to.equal(true);
  });
});
