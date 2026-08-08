use anchor_lang::prelude::*;

/// Max concurrent sealed bids a single deal can hold. Matches the account-scan
/// pattern in `reveal_deal` (bounded by `remaining_accounts`); raise with care,
/// it drives both compute cost and rent for the deal's sponsor-funded PER accounts.
pub const MAX_BIDDERS: usize = 20;

/// Basis-points denominator (100.00% == 10_000 bps).
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Total supply minted for a deal's equity token, denominated at 6 decimals.
/// Represents the full 100% cap table for *this deal's* equity mint — each deal
/// gets its own fresh mint, so this is not shared across deals.
pub const EQUITY_TOTAL_SUPPLY: u64 = 1_000_000_000_000; // 1,000,000.000000 tokens

#[account]
pub struct Deal {
    /// Startup founder who posted the deal and receives funding-token proceeds.
    pub startup: Pubkey,
    pub deal_id: u64,
    /// Token bidders pay with (e.g. a devnet USDC mint).
    pub funding_mint: Pubkey,
    /// Startup's declared valuation, in funding-token smallest units. Informational.
    pub valuation: u64,
    /// Share of the company being offered in this round, in basis points (0-10_000).
    pub equity_bps: u16,
    pub min_investment: u64,
    /// Soft raise target. Not enforced on-chain; surfaced for the frontend and to
    /// flag oversubscription at reveal (see `Deal.oversubscribed`).
    pub max_cap: u64,
    pub deadline_ts: i64,
    pub bid_count: u8,
    pub closed_bid_count: u8,
    /// Sum of all accepted bid amounts. Zero until `reveal_deal` runs.
    pub total_raised: u64,
    pub status: DealStatus,
    pub oversubscribed: bool,
    /// Cliff before vesting starts, in months. Informational for MVP — on-chain
    /// vesting enforcement is out of scope (see programs/sealed-auction README).
    pub cliff_months: u16,
    pub vesting_months: u16,
    pub bump: u8,
}

impl Deal {
    pub const LEN: usize = 32 + 8 + 32 + 8 + 2 + 8 + 8 + 8 + 1 + 1 + 8 + 1 + 1 + 2 + 2 + 1;
}

#[account]
pub struct Bid {
    pub deal: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub bidder_index: u8,
    pub escrow: Pubkey,
    /// Equity tokens allocated to this bidder, computed once during `reveal_deal`
    /// as `amount / total_raised * equity_bps / 10_000 * EQUITY_TOTAL_SUPPLY`.
    pub equity_allocated: u64,
    pub bump: u8,
}

impl Bid {
    pub const LEN: usize = 32 + 32 + 8 + 1 + 32 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DealStatus {
    /// Accepting sealed bids.
    Open,
    /// Deadline passed, bids revealed and summed; equity allocations computed.
    Revealed,
    /// Every bid has been settled (equity minted, funds forwarded) or refunded
    /// (no-bid case) and the deal PDA has been undelegated back to L1.
    Settled,
}
