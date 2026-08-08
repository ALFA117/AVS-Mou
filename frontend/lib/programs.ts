import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import { PublicKey, type Connection } from "@solana/web3.js";

import sealedAuctionIdl from "./idl/sealed_auction.json";
import privateVotingIdl from "./idl/private_voting.json";
import splTokenManagerIdl from "./idl/spl_token_manager.json";
import type { SealedAuction } from "./idl/sealed_auction";
import type { PrivateVoting } from "./idl/private_voting";
import type { SplTokenManager } from "./idl/spl_token_manager";

export const SEALED_AUCTION_PROGRAM_ID = new PublicKey(
  "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo",
);
export const PRIVATE_VOTING_PROGRAM_ID = new PublicKey(
  "ErRYzAmuTFGHQSzZ7A38zX2rmwosGxDYTvPtPCSPq4Qs",
);
export const SPL_TOKEN_MANAGER_PROGRAM_ID = new PublicKey(
  "fNkSCkp2szKMND8ouKwfxNpGqhAsnCdQ4PTzsxnDKa3",
);

export const DEAL_SEED = Buffer.from("deal");
export const BID_SEED = Buffer.from("bid");
export const MILESTONE_SEED = Buffer.from("milestone");
export const VOTE_SEED = Buffer.from("vote");
export const SYNDICATE_SEED = Buffer.from("syndicate");

function provider(connection: Connection, wallet: Wallet): AnchorProvider {
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

export function sealedAuctionProgram(
  connection: Connection,
  wallet: Wallet,
): Program<SealedAuction> {
  return new Program(sealedAuctionIdl as SealedAuction, provider(connection, wallet));
}

export function privateVotingProgram(
  connection: Connection,
  wallet: Wallet,
): Program<PrivateVoting> {
  return new Program(privateVotingIdl as PrivateVoting, provider(connection, wallet));
}

export function splTokenManagerProgram(
  connection: Connection,
  wallet: Wallet,
): Program<SplTokenManager> {
  return new Program(splTokenManagerIdl as SplTokenManager, provider(connection, wallet));
}

export function dealPda(startup: PublicKey, dealId: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(dealId);
  return PublicKey.findProgramAddressSync(
    [DEAL_SEED, startup.toBuffer(), buf],
    SEALED_AUCTION_PROGRAM_ID,
  )[0];
}

export function bidPda(deal: PublicKey, bidder: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [BID_SEED, deal.toBuffer(), bidder.toBuffer()],
    SEALED_AUCTION_PROGRAM_ID,
  )[0];
}

export function milestonePda(startup: PublicKey, milestoneId: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(milestoneId);
  return PublicKey.findProgramAddressSync(
    [MILESTONE_SEED, startup.toBuffer(), buf],
    PRIVATE_VOTING_PROGRAM_ID,
  )[0];
}

export function votePda(milestone: PublicKey, voter: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VOTE_SEED, milestone.toBuffer(), voter.toBuffer()],
    PRIVATE_VOTING_PROGRAM_ID,
  )[0];
}

export function syndicatePda(deal: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [SYNDICATE_SEED, deal.toBuffer()],
    SPL_TOKEN_MANAGER_PROGRAM_ID,
  )[0];
}
