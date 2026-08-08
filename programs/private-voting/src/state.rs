use anchor_lang::prelude::*;

/// Max concurrent sealed votes a single milestone can hold. Mirrors
/// sealed-auction's MAX_BIDDERS bound for the same reasons (remaining_accounts
/// scan cost + sponsor-funded PER rent).
pub const MAX_VOTERS: usize = 20;

#[account]
pub struct Milestone {
    /// Startup that proposed the milestone and funds the reward pool.
    pub startup: Pubkey,
    /// Informational link to the sealed-auction Deal PDA this syndicate came
    /// from. Not CPI-verified in this MVP — see programs/private-voting/README.md.
    pub deal: Pubkey,
    pub milestone_id: u64,
    /// Hash of the off-chain milestone description (e.g. "Reach $1M ARR"),
    /// keeps on-chain footprint small while still binding the vote to specific terms.
    pub description_hash: [u8; 32],
    pub deadline_ts: i64,
    /// Lamports set aside at creation time, split evenly among voters who
    /// end up on the winning side of the outcome.
    pub reward_pool: u64,
    pub voter_count: u8,
    pub closed_vote_count: u8,
    pub yes_count: u8,
    pub no_count: u8,
    pub outcome: Outcome,
    pub status: MilestoneStatus,
    /// VRF output, gates reward settlement — see `request_milestone_randomness`.
    pub randomness: [u8; 32],
    pub randomness_fulfilled: bool,
    pub bump: u8,
}

impl Milestone {
    pub const LEN: usize = 32 + 32 + 8 + 32 + 8 + 8 + 1 + 1 + 1 + 1 + 1 + 1 + 32 + 1 + 1;
}

#[account]
pub struct Vote {
    pub milestone: Pubkey,
    pub voter: Pubkey,
    pub choice: Choice,
    pub voter_index: u8,
    pub bump: u8,
}

impl Vote {
    pub const LEN: usize = 32 + 32 + 1 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Choice {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    Yes,
    No,
    Tie,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MilestoneStatus {
    /// Accepting sealed votes.
    Open,
    /// Deadline passed, votes revealed and tallied.
    Revealed,
    /// Every vote has been settled (reward paid or not) and the milestone
    /// PDA has been undelegated back to L1.
    Settled,
}
