use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("amount must be > 0")]
    InvalidAmount,
    #[msg("token account is not owned by the expected authority")]
    InvalidTokenOwner,
    #[msg("token account mint mismatch")]
    MintMismatch,
    #[msg("invalid ephemeral token account PDA")]
    InvalidEphemeralAta,
    #[msg("arithmetic overflow")]
    MathOverflow,
}
