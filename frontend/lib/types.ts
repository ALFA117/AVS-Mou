/**
 * Domain types mirroring the on-chain account shapes in
 * programs/sealed-auction, programs/private-voting, and
 * programs/spl-token-manager. Field names here are camelCase (Anchor's IDL
 * client auto-converts snake_case on-chain field names).
 */

export type DealStatus = "open" | "revealed" | "settled";

export interface Deal {
  publicKey: string;
  startup: string;
  dealId: string; // u64, kept as string to avoid precision loss
  fundingMint: string;
  valuation: string;
  equityBps: number;
  minInvestment: string;
  maxCap: string;
  deadlineTs: number;
  bidCount: number;
  closedBidCount: number;
  totalRaised: string;
  status: DealStatus;
  oversubscribed: boolean;
  cliffMonths: number;
  vestingMonths: number;
}

export interface Bid {
  publicKey: string;
  deal: string;
  bidder: string;
  amount: string;
  bidderIndex: number;
  escrow: string;
  equityAllocated: string;
}

export type MilestoneStatus = "open" | "revealed" | "settled";
export type Outcome = "pending" | "yes" | "no" | "tie";

export interface Milestone {
  publicKey: string;
  startup: string;
  deal: string;
  milestoneId: string;
  descriptionHash: string;
  deadlineTs: number;
  rewardPool: string;
  voterCount: number;
  closedVoteCount: number;
  yesCount: number;
  noCount: number;
  outcome: Outcome;
  status: MilestoneStatus;
  randomnessFulfilled: boolean;
}

export type Choice = "yes" | "no";

export interface Syndicate {
  publicKey: string;
  deal: string;
  startup: string;
  equityMint: string;
  memberCount: number;
  totalMinted: string;
}

/** A user's position in one deal — derived from a settled Bid, not a distinct on-chain account. */
export interface Position {
  dealPublicKey: string;
  dealTitle: string;
  bidAmount: string;
  equityAllocated: string;
  entryDate: number;
  status: "active" | "voting" | "liquidated";
}

/** Client-side only for now — see programs/private-voting README and docs task 073 scope note. */
export interface ChatMessage {
  id: string;
  syndicateId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

export type MemberRole = "founder" | "member" | "observer";
