use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("deadline must be in the future")]
    DeadlineInPast,
    #[msg("milestone is not open")]
    MilestoneClosed,
    #[msg("milestone voting deadline has not passed")]
    MilestoneStillOpen,
    #[msg("milestone has not been revealed yet")]
    MilestoneNotRevealed,
    #[msg("too many voters")]
    TooManyVoters,
    #[msg("missing vote account")]
    MissingVote,
    #[msg("invalid vote account")]
    InvalidVote,
    #[msg("duplicate vote account")]
    DuplicateVote,
    #[msg("not all votes are settled")]
    UnsettledVotes,
    #[msg("VRF randomness has not been fulfilled yet")]
    RandomnessNotFulfilled,
    #[msg("randomness has already been fulfilled")]
    RandomnessAlreadyFulfilled,
    #[msg("arithmetic overflow computing reward")]
    RewardMathOverflow,
    #[msg("signer is neither the member nor a valid, unexpired session for them")]
    InvalidSession,
}
