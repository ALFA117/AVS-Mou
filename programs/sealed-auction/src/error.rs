use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("amount must be greater than zero")]
    InvalidAmount,
    #[msg("bid is below the deal's minimum investment")]
    BelowMinInvestment,
    #[msg("equity_bps must be between 1 and 10_000")]
    InvalidEquityBps,
    #[msg("deadline must be in the future")]
    DeadlineInPast,
    #[msg("deal deadline has not passed")]
    DealStillOpen,
    #[msg("deal is not open")]
    DealClosed,
    #[msg("deal has not been revealed yet")]
    DealNotRevealed,
    #[msg("too many bidders")]
    TooManyBidders,
    #[msg("missing bid account")]
    MissingBid,
    #[msg("invalid bid account")]
    InvalidBid,
    #[msg("token account is not owned by the expected authority")]
    InvalidTokenOwner,
    #[msg("token account mint mismatch")]
    MintMismatch,
    #[msg("invalid bid escrow account")]
    InvalidBidEscrow,
    #[msg("duplicate bid account")]
    DuplicateBid,
    #[msg("not all bid accounts are settled")]
    UnsettledBids,
    #[msg("arithmetic overflow computing equity allocation")]
    EquityMathOverflow,
    #[msg("bid has already been settled")]
    BidAlreadySettled,
    #[msg("signer is neither the investor nor a valid, unexpired session for them")]
    InvalidSession,
}
