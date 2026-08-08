use anchor_lang::prelude::*;

/// One per sealed-auction Deal, created after that deal reveals. Owns the
/// mint authority for the deal's equity token.
#[account]
pub struct Syndicate {
    /// Informational link to the sealed-auction Deal PDA. Not CPI-verified —
    /// see programs/spl-token-manager/README.md.
    pub deal: Pubkey,
    pub startup: Pubkey,
    pub equity_mint: Pubkey,
    pub member_count: u8,
    pub total_minted: u64,
    pub bump: u8,
}

impl Syndicate {
    pub const LEN: usize = 32 + 32 + 32 + 1 + 8 + 1;
}
