/**
 * Converts raw Anchor-deserialized on-chain accounts (BN fields, enum
 * variant objects) into the plain-JSON-friendly types in lib/types.ts.
 */
import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
import type {
  Bid,
  Deal,
  DealStatus,
  Milestone,
  MilestoneStatus,
  Outcome,
  Syndicate,
  Vote,
  Choice,
} from "./types";

function enumVariant<T extends string>(value: Record<string, unknown>): T {
  return Object.keys(value)[0] as T;
}

export function mapDeal(publicKey: PublicKey, account: Record<string, unknown>): Deal {
  return {
    publicKey: publicKey.toBase58(),
    startup: (account.startup as PublicKey).toBase58(),
    dealId: (account.dealId as BN).toString(),
    fundingMint: (account.fundingMint as PublicKey).toBase58(),
    valuation: (account.valuation as BN).toString(),
    equityBps: account.equityBps as number,
    minInvestment: (account.minInvestment as BN).toString(),
    maxCap: (account.maxCap as BN).toString(),
    deadlineTs: (account.deadlineTs as BN).toNumber(),
    bidCount: account.bidCount as number,
    closedBidCount: account.closedBidCount as number,
    totalRaised: (account.totalRaised as BN).toString(),
    status: enumVariant<DealStatus>(account.status as Record<string, unknown>),
    oversubscribed: account.oversubscribed as boolean,
    cliffMonths: account.cliffMonths as number,
    vestingMonths: account.vestingMonths as number,
  };
}

export function mapBid(publicKey: PublicKey, account: Record<string, unknown>): Bid {
  return {
    publicKey: publicKey.toBase58(),
    deal: (account.deal as PublicKey).toBase58(),
    bidder: (account.bidder as PublicKey).toBase58(),
    amount: (account.amount as BN).toString(),
    bidderIndex: account.bidderIndex as number,
    escrow: (account.escrow as PublicKey).toBase58(),
    equityAllocated: (account.equityAllocated as BN).toString(),
  };
}

export function mapMilestone(publicKey: PublicKey, account: Record<string, unknown>): Milestone {
  return {
    publicKey: publicKey.toBase58(),
    startup: (account.startup as PublicKey).toBase58(),
    deal: (account.deal as PublicKey).toBase58(),
    milestoneId: (account.milestoneId as BN).toString(),
    descriptionHash: Buffer.from(account.descriptionHash as number[]).toString("hex"),
    deadlineTs: (account.deadlineTs as BN).toNumber(),
    rewardPool: (account.rewardPool as BN).toString(),
    voterCount: account.voterCount as number,
    closedVoteCount: account.closedVoteCount as number,
    yesCount: account.yesCount as number,
    noCount: account.noCount as number,
    outcome: enumVariant<Outcome>(account.outcome as Record<string, unknown>),
    status: enumVariant<MilestoneStatus>(account.status as Record<string, unknown>),
    randomnessFulfilled: account.randomnessFulfilled as boolean,
  };
}

export function mapVote(publicKey: PublicKey, account: Record<string, unknown>): Vote {
  return {
    publicKey: publicKey.toBase58(),
    milestone: (account.milestone as PublicKey).toBase58(),
    voter: (account.voter as PublicKey).toBase58(),
    choice: enumVariant<Choice>(account.choice as Record<string, unknown>),
    voterIndex: account.voterIndex as number,
  };
}

export function mapSyndicate(publicKey: PublicKey, account: Record<string, unknown>): Syndicate {
  return {
    publicKey: publicKey.toBase58(),
    deal: (account.deal as PublicKey).toBase58(),
    startup: (account.startup as PublicKey).toBase58(),
    equityMint: (account.equityMint as PublicKey).toBase58(),
    memberCount: account.memberCount as number,
    totalMinted: (account.totalMinted as BN).toString(),
  };
}
