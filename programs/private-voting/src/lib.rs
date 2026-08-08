//! AVS private milestone voting.
//!
//! Structurally this borrows the sealed-bid pattern from `sealed-auction`
//! (see that program's README for the privacy model — sealed here means
//! access-controlled by MagicBlock's private Ephemeral Rollup Permissions,
//! not ciphertext) applied to YES/NO votes instead of bid amounts, plus the
//! VRF request/callback pattern from the `roll-dice` example
//! (`vendor/magicblock-engine-examples/roll-dice/anchor/programs/roll-dice-delegated`)
//! for reward-settlement fairness.
//!
//! Scope cuts (see programs/private-voting/README.md for the full list):
//! - One member = one vote. Equity-weighted voting would need a CPI back
//!   into `sealed-auction` to read each bidder's allocation; out of scope
//!   for this MVP.
//! - Rewards are a flat pool split evenly among voters on the winning side —
//!   VRF gates *when* settlement can happen (proof the payout wasn't
//!   front-run), not a weighted/bonus split. See README for the documented
//!   extension path.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{
    access_control::{
        instructions::{CloseEphemeralPermissionCpi, CreateEphemeralPermissionCpi},
        structs::{
            EphemeralMembersArgs, EphemeralPermission, Member, AUTHORITY_FLAG, PERMISSION_SEED,
            TX_BALANCES_FLAG, TX_LOGS_FLAG, TX_MESSAGE_FLAG,
        },
    },
    anchor::{commit, delegate, ephemeral, ephemeral_accounts, vrf, vrf_callback},
    consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID},
    cpi::DelegateConfig,
    ephem::MagicIntentBundleBuilder,
    vrf::{
        instructions::{create_request_scoped_randomness_ix, RequestRandomnessParams},
        types::SerializableAccountMeta,
    },
};
use session_keys::SessionTokenV2;

mod error;
mod state;

use error::ErrorCode;
use state::{Choice, Milestone, MilestoneStatus, Outcome, Vote, MAX_VOTERS};

declare_id!("ErRYzAmuTFGHQSzZ7A38zX2rmwosGxDYTvPtPCSPq4Qs");

pub const MILESTONE_SEED: &[u8] = b"milestone";
pub const VOTE_SEED: &[u8] = b"vote";

#[ephemeral]
#[program]
pub mod private_voting {
    use super::*;

    pub fn initialize_milestone(
        ctx: Context<InitializeMilestone>,
        milestone_id: u64,
        deal: Pubkey,
        description_hash: [u8; 32],
        deadline_ts: i64,
        reward_pool: u64,
        sponsor_lamports: u64,
    ) -> Result<()> {
        require!(
            deadline_ts > Clock::get()?.unix_timestamp,
            ErrorCode::DeadlineInPast
        );

        let rent_lamports = ephemeral_rollups_sdk::ephemeral_accounts::rent(
            EphemeralPermission::size_of(MAX_VOTERS + 1) as u32,
        );
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.startup.to_account_info(),
                    to: ctx.accounts.milestone.to_account_info(),
                },
            ),
            rent_lamports
                .checked_add(sponsor_lamports)
                .and_then(|v| v.checked_add(reward_pool))
                .ok_or(ErrorCode::RewardMathOverflow)?,
        )?;

        let milestone_key = ctx.accounts.milestone.key();
        ctx.accounts.milestone.startup = ctx.accounts.startup.key();
        ctx.accounts.milestone.deal = deal;
        ctx.accounts.milestone.milestone_id = milestone_id;
        ctx.accounts.milestone.description_hash = description_hash;
        ctx.accounts.milestone.deadline_ts = deadline_ts;
        ctx.accounts.milestone.reward_pool = reward_pool;
        ctx.accounts.milestone.voter_count = 0;
        ctx.accounts.milestone.closed_vote_count = 0;
        ctx.accounts.milestone.yes_count = 0;
        ctx.accounts.milestone.no_count = 0;
        ctx.accounts.milestone.outcome = Outcome::Pending;
        ctx.accounts.milestone.status = MilestoneStatus::Open;
        ctx.accounts.milestone.randomness = [0u8; 32];
        ctx.accounts.milestone.randomness_fulfilled = false;
        ctx.accounts.milestone.bump = ctx.bumps.milestone;

        emit!(MilestoneCreated {
            milestone: milestone_key,
            startup: ctx.accounts.startup.key(),
            deal,
            milestone_id,
            deadline_ts,
            reward_pool,
        });
        msg!("Initialized milestone {}", milestone_key);
        Ok(())
    }

    pub fn delegate_milestone(ctx: Context<DelegateMilestone>, milestone_id: u64) -> Result<()> {
        let validator = ctx.accounts.validator.as_ref().map(|v| v.key());
        let startup = ctx.accounts.startup.key();
        let milestone_id_bytes = milestone_id.to_le_bytes();
        ctx.accounts.delegate_milestone(
            &ctx.accounts.startup,
            &[MILESTONE_SEED, startup.as_ref(), &milestone_id_bytes],
            DelegateConfig {
                validator,
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn init_milestone_permission(
        ctx: Context<MilestonePermission>,
        milestone_id: u64,
    ) -> Result<()> {
        require_eq!(ctx.accounts.milestone.milestone_id, milestone_id);
        if ctx.accounts.permission.lamports() > 0 {
            msg!("Milestone permission already exists");
            return Ok(());
        }

        let milestone_id_bytes = ctx.accounts.milestone.milestone_id.to_le_bytes();
        let bump = [ctx.bumps.milestone];
        let signers: &[&[u8]] = &[
            MILESTONE_SEED,
            ctx.accounts.milestone.startup.as_ref(),
            &milestone_id_bytes,
            &bump,
        ];
        let members = vec![permission_member(ctx.accounts.milestone.startup)];

        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.milestone.to_account_info(),
            permissioned_account: ctx.accounts.milestone.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: false,
                members,
            },
        }
        .invoke_signed(&[signers])?;
        Ok(())
    }

    /// Cast a sealed YES/NO vote. The choice is stored on an ER-only (`eph`)
    /// account sponsored by the milestone; nothing about the choice is ever
    /// logged or emitted here, so it stays invisible until `reveal_milestone`.
    ///
    /// `member` is the real wallet this vote belongs to. `voter` (the
    /// signer) must either *be* `member` directly, or hold a valid,
    /// unexpired session token authorizing it to sign for `member` — see
    /// `docs/SESSION_KEYS.md`. The `session_token` account's PDA seeds
    /// (checked via the `#[account(seeds = ...)]` constraint below) already
    /// prove it was minted for exactly this (program, voter, member)
    /// triple; only expiry needs a runtime check.
    pub fn cast_vote(
        ctx: Context<CastVote>,
        milestone_id: u64,
        member: Pubkey,
        choice: Choice,
    ) -> Result<()> {
        let session_valid = match &ctx.accounts.session_token {
            Some(token) => !token.is_expired()?,
            None => false,
        };
        require!(
            ctx.accounts.voter.key() == member || session_valid,
            ErrorCode::InvalidSession
        );

        require_eq!(ctx.accounts.milestone.milestone_id, milestone_id);
        require!(
            ctx.accounts.milestone.status == MilestoneStatus::Open,
            ErrorCode::MilestoneClosed
        );
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.milestone.deadline_ts,
            ErrorCode::MilestoneClosed
        );
        require!(
            (ctx.accounts.milestone.voter_count as usize) < MAX_VOTERS,
            ErrorCode::TooManyVoters
        );

        let milestone_key = ctx.accounts.milestone.key();

        ctx.accounts.create_ephemeral_vote((8 + Vote::LEN) as u32)?;

        let voter_index = ctx.accounts.milestone.voter_count;
        let vote = Vote {
            milestone: milestone_key,
            voter: member,
            choice,
            voter_index,
            bump: ctx.bumps.vote,
        };
        write_vote(&ctx.accounts.vote.to_account_info(), &vote)?;

        ctx.accounts.milestone.voter_count = voter_index + 1;

        emit!(VoteCast {
            milestone: milestone_key,
            voter: member,
            voter_index,
        });
        msg!("Sealed vote cast for milestone {}", milestone_key);
        Ok(())
    }

    pub fn init_vote_permission(ctx: Context<InitVotePermission>, milestone_id: u64) -> Result<()> {
        require_eq!(ctx.accounts.milestone.milestone_id, milestone_id);
        require_keys_eq!(
            ctx.accounts.vote.milestone,
            ctx.accounts.milestone.key(),
            ErrorCode::InvalidVote
        );
        if !ctx.accounts.vote_permission.data_is_empty() {
            msg!("Vote permission already exists");
            return Ok(());
        }

        let milestone_id_bytes = ctx.accounts.milestone.milestone_id.to_le_bytes();
        let milestone_bump = [ctx.accounts.milestone.bump];
        let milestone_signers: &[&[u8]] = &[
            MILESTONE_SEED,
            ctx.accounts.milestone.startup.as_ref(),
            &milestone_id_bytes,
            &milestone_bump,
        ];
        let milestone_key = ctx.accounts.milestone.key();
        let vote_bump = [ctx.accounts.vote.bump];
        let vote_signers: &[&[u8]] = &[
            VOTE_SEED,
            milestone_key.as_ref(),
            ctx.accounts.vote.voter.as_ref(),
            &vote_bump,
        ];
        // is_private: true is what actually seals the vote — only the startup
        // and the voter can read this account's data on the ER until closed.
        let vote_members = vec![
            permission_member(ctx.accounts.milestone.startup),
            permission_member(ctx.accounts.vote.voter),
        ];
        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.milestone.to_account_info(),
            permissioned_account: ctx.accounts.vote.to_account_info(),
            permission: ctx.accounts.vote_permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: vote_members,
            },
        }
        .invoke_signed(&[milestone_signers, vote_signers])?;

        msg!("Vote permission created for {}", ctx.accounts.vote.key());
        Ok(())
    }

    /// The reveal: after the deadline, scan every vote account and tally.
    pub fn reveal_milestone(ctx: Context<RevealMilestone>, milestone_id: u64) -> Result<()> {
        require_eq!(ctx.accounts.milestone.milestone_id, milestone_id);
        require!(
            ctx.accounts.milestone.status == MilestoneStatus::Open,
            ErrorCode::MilestoneClosed
        );
        require!(
            Clock::get()?.unix_timestamp >= ctx.accounts.milestone.deadline_ts,
            ErrorCode::MilestoneStillOpen
        );

        let milestone_key = ctx.accounts.milestone.key();
        let voter_count = ctx.accounts.milestone.voter_count as usize;
        require!(
            ctx.remaining_accounts.len() == voter_count,
            ErrorCode::MissingVote
        );

        let mut yes_count: u8 = 0;
        let mut no_count: u8 = 0;
        for index in 0..voter_count {
            let vote_info = &ctx.remaining_accounts[index];
            let vote = Account::<Vote>::try_from(vote_info)?;
            require_keys_eq!(vote.milestone, milestone_key, ErrorCode::InvalidVote);
            let expected_vote = Pubkey::find_program_address(
                &[VOTE_SEED, milestone_key.as_ref(), vote.voter.as_ref()],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(vote_info.key(), expected_vote, ErrorCode::InvalidVote);
            require!(
                (vote.voter_index as usize) < voter_count,
                ErrorCode::InvalidVote
            );

            for previous_index in 0..index {
                let previous_info = &ctx.remaining_accounts[previous_index];
                require_keys_neq!(vote_info.key(), previous_info.key(), ErrorCode::DuplicateVote);
                let previous_vote = Account::<Vote>::try_from(previous_info)?;
                require!(
                    vote.voter_index != previous_vote.voter_index,
                    ErrorCode::DuplicateVote
                );
            }

            match vote.choice {
                Choice::Yes => yes_count = yes_count.checked_add(1).ok_or(ErrorCode::TooManyVoters)?,
                Choice::No => no_count = no_count.checked_add(1).ok_or(ErrorCode::TooManyVoters)?,
            }
        }

        let outcome = if yes_count > no_count {
            Outcome::Yes
        } else if no_count > yes_count {
            Outcome::No
        } else {
            Outcome::Tie
        };

        ctx.accounts.milestone.yes_count = yes_count;
        ctx.accounts.milestone.no_count = no_count;
        ctx.accounts.milestone.outcome = outcome;
        ctx.accounts.milestone.status = MilestoneStatus::Revealed;

        emit!(MilestoneRevealed {
            milestone: milestone_key,
            yes_count,
            no_count,
            outcome,
        });
        msg!(
            "Revealed milestone {} — {} yes, {} no",
            milestone_key,
            yes_count,
            no_count
        );
        Ok(())
    }

    /// Requests verifiable randomness that gates reward settlement — proof
    /// that payout eligibility wasn't front-run or known in advance.
    pub fn request_milestone_randomness(
        ctx: Context<RequestMilestoneRandomness>,
        milestone_id: u64,
    ) -> Result<()> {
        require_eq!(ctx.accounts.milestone.milestone_id, milestone_id);
        require!(
            ctx.accounts.milestone.status == MilestoneStatus::Revealed,
            ErrorCode::MilestoneNotRevealed
        );
        require!(
            !ctx.accounts.milestone.randomness_fulfilled,
            ErrorCode::RandomnessAlreadyFulfilled
        );

        let ix = create_request_scoped_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: instruction::MilestoneRandomnessCallback::DISCRIMINATOR
                .to_vec(),
            caller_seed: ctx.accounts.milestone.key().to_bytes(),
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.milestone.key(),
                is_signer: false,
                is_writable: true,
            }]),
            ..Default::default()
        });
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    pub fn milestone_randomness_callback(
        ctx: Context<MilestoneRandomnessCallbackCtx>,
        randomness: [u8; 32],
    ) -> Result<()> {
        require!(
            !ctx.accounts.milestone.randomness_fulfilled,
            ErrorCode::RandomnessAlreadyFulfilled
        );
        let milestone_key = ctx.accounts.milestone.key();
        ctx.accounts.milestone.randomness = randomness;
        ctx.accounts.milestone.randomness_fulfilled = true;
        msg!("Randomness fulfilled for milestone {}", milestone_key);
        Ok(())
    }

    /// Runs once per vote after reveal + randomness fulfillment: pays out an
    /// even share of `reward_pool` to voters on the winning side (no payout
    /// otherwise), then closes the sealed vote account.
    pub fn settle_vote(ctx: Context<SettleVote>) -> Result<()> {
        require!(
            ctx.accounts.milestone.status == MilestoneStatus::Revealed,
            ErrorCode::MilestoneNotRevealed
        );
        require!(
            ctx.accounts.milestone.randomness_fulfilled,
            ErrorCode::RandomnessNotFulfilled
        );

        let milestone_key = ctx.accounts.milestone.key();
        let vote_info = ctx.accounts.vote.to_account_info();
        let vote = read_vote(&vote_info)?;
        require_keys_eq!(vote.milestone, milestone_key, ErrorCode::InvalidVote);
        require_keys_eq!(vote.voter, ctx.accounts.voter.key(), ErrorCode::InvalidVote);

        let outcome = ctx.accounts.milestone.outcome;
        let voted_correctly = matches!(
            (outcome, vote.choice),
            (Outcome::Yes, Choice::Yes) | (Outcome::No, Choice::No)
        );

        let mut reward_paid: u64 = 0;
        if voted_correctly {
            let winning_count = match outcome {
                Outcome::Yes => ctx.accounts.milestone.yes_count,
                Outcome::No => ctx.accounts.milestone.no_count,
                _ => 0,
            } as u64;
            if winning_count > 0 {
                reward_paid = ctx.accounts.milestone.reward_pool / winning_count;
            }
        }

        if reward_paid > 0 {
            let milestone_info = ctx.accounts.milestone.to_account_info();
            **milestone_info.try_borrow_mut_lamports()? = milestone_info
                .lamports()
                .checked_sub(reward_paid)
                .ok_or(ErrorCode::RewardMathOverflow)?;
            let voter_info = ctx.accounts.voter.to_account_info();
            **voter_info.try_borrow_mut_lamports()? = voter_info
                .lamports()
                .checked_add(reward_paid)
                .ok_or(ErrorCode::RewardMathOverflow)?;
        }

        let vote_bump = [vote.bump];
        let vote_seeds: &[&[u8]] = &[
            VOTE_SEED,
            vote.milestone.as_ref(),
            vote.voter.as_ref(),
            &vote_bump,
        ];
        let milestone_id_bytes = ctx.accounts.milestone.milestone_id.to_le_bytes();
        let milestone_bump = [ctx.accounts.milestone.bump];
        let milestone_signers: &[&[u8]] = &[
            MILESTONE_SEED,
            ctx.accounts.milestone.startup.as_ref(),
            &milestone_id_bytes,
            &milestone_bump,
        ];
        close_vote_permission(&CloseVotePermissionAccounts {
            sponsor: ctx.accounts.milestone.to_account_info(),
            vote: ctx.accounts.vote.to_account_info(),
            permission: ctx.accounts.vote_permission.to_account_info(),
            ephemeral_vault: ctx.accounts.vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            sponsor_signers: milestone_signers,
            vote_signers: vote_seeds,
        })?;
        ctx.accounts.close_ephemeral_vote()?;

        ctx.accounts.milestone.closed_vote_count = ctx
            .accounts
            .milestone
            .closed_vote_count
            .checked_add(1)
            .ok_or(ErrorCode::TooManyVoters)?;

        emit!(VoteSettled {
            milestone: milestone_key,
            voter: vote.voter,
            voted_correctly,
            reward_paid,
        });
        Ok(())
    }

    pub fn undelegate_milestone(
        ctx: Context<UndelegateMilestone>,
        milestone_id: u64,
    ) -> Result<()> {
        require_eq!(ctx.accounts.milestone.milestone_id, milestone_id);
        require!(
            ctx.accounts.milestone.status == MilestoneStatus::Revealed,
            ErrorCode::MilestoneNotRevealed
        );
        require_eq!(
            ctx.accounts.milestone.closed_vote_count,
            ctx.accounts.milestone.voter_count,
            ErrorCode::UnsettledVotes
        );

        let milestone_key = ctx.accounts.milestone.key();
        let outcome = ctx.accounts.milestone.outcome;
        let yes_count = ctx.accounts.milestone.yes_count;
        let no_count = ctx.accounts.milestone.no_count;

        // Mutate before the commit CPI — see sealed-auction's
        // undelegate_deal for why (ExternalAccountDataModified otherwise).
        ctx.accounts.milestone.status = MilestoneStatus::Settled;

        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.milestone.to_account_info()])
        .build_and_invoke()?;

        emit!(MilestoneSettled {
            milestone: milestone_key,
            outcome,
            yes_count,
            no_count,
        });
        msg!("Milestone {} settled", milestone_key);
        Ok(())
    }
}

#[event]
pub struct MilestoneCreated {
    pub milestone: Pubkey,
    pub startup: Pubkey,
    pub deal: Pubkey,
    pub milestone_id: u64,
    pub deadline_ts: i64,
    pub reward_pool: u64,
}

#[event]
pub struct VoteCast {
    pub milestone: Pubkey,
    pub voter: Pubkey,
    pub voter_index: u8,
}

#[event]
pub struct MilestoneRevealed {
    pub milestone: Pubkey,
    pub yes_count: u8,
    pub no_count: u8,
    pub outcome: Outcome,
}

#[event]
pub struct VoteSettled {
    pub milestone: Pubkey,
    pub voter: Pubkey,
    pub voted_correctly: bool,
    pub reward_paid: u64,
}

#[event]
pub struct MilestoneSettled {
    pub milestone: Pubkey,
    pub outcome: Outcome,
    pub yes_count: u8,
    pub no_count: u8,
}

fn permission_member(pubkey: Pubkey) -> Member {
    Member {
        flags: AUTHORITY_FLAG | TX_LOGS_FLAG | TX_MESSAGE_FLAG | TX_BALANCES_FLAG,
        pubkey,
    }
}

fn write_vote(account_info: &AccountInfo, vote: &Vote) -> Result<()> {
    let mut data = account_info.try_borrow_mut_data()?;
    vote.try_serialize(&mut &mut data[..])?;
    Ok(())
}

fn read_vote(account_info: &AccountInfo) -> Result<Vote> {
    let data = account_info.try_borrow_data()?;
    let mut cursor = &data[..];
    Vote::try_deserialize(&mut cursor)
}

struct CloseVotePermissionAccounts<'a, 'info> {
    sponsor: AccountInfo<'info>,
    vote: AccountInfo<'info>,
    permission: AccountInfo<'info>,
    ephemeral_vault: AccountInfo<'info>,
    magic_program: AccountInfo<'info>,
    permission_program: AccountInfo<'info>,
    sponsor_signers: &'a [&'a [u8]],
    vote_signers: &'a [&'a [u8]],
}

fn close_vote_permission(accounts: &CloseVotePermissionAccounts<'_, '_>) -> Result<()> {
    CloseEphemeralPermissionCpi {
        payer: accounts.sponsor.clone(),
        authority: accounts.vote.clone(),
        permissioned_account: accounts.vote.clone(),
        permission: accounts.permission.clone(),
        vault: accounts.ephemeral_vault.clone(),
        magic_program: accounts.magic_program.clone(),
        permission_program: accounts.permission_program.clone(),
        authority_is_signer: false,
    }
    .invoke_signed(&[accounts.sponsor_signers, accounts.vote_signers])?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct InitializeMilestone<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        init,
        payer = startup,
        space = 8 + Milestone::LEN,
        seeds = [MILESTONE_SEED, startup.key().as_ref(), &milestone_id.to_le_bytes()],
        bump
    )]
    pub milestone: Box<Account<'info, Milestone>>,
    pub system_program: Program<'info, System>,
}

/// `payer` is unconstrained on purpose — mirrors sealed-auction's PlaceBid
/// (see that program's doc comment): any funded signer can cover the vote
/// account's rent + tx fee, which is what lets the relay backend sponsor
/// real member votes (docs/RELAY.md).
#[ephemeral_accounts]
#[derive(Accounts)]
#[instruction(milestone_id: u64, member: Pubkey)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The real member wallet directly, or a session signer authorized for
    /// it — validated against `session_token` in `cast_vote`.
    pub voter: Signer<'info>,
    /// Its PDA seeds bind it to exactly this (program, voter, member)
    /// triple — see `docs/SESSION_KEYS.md`.
    #[account(
        seeds = [
            SessionTokenV2::SEED_PREFIX.as_bytes(),
            crate::ID.as_ref(),
            voter.key().as_ref(),
            member.as_ref(),
        ],
        bump,
        seeds::program = session_keys::ID
    )]
    pub session_token: Option<Account<'info, SessionTokenV2>>,
    #[account(
        mut,
        sponsor,
        seeds = [MILESTONE_SEED, milestone.startup.as_ref(), &milestone.milestone_id.to_le_bytes()],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    /// CHECK: Ephemeral vote PDA sponsored by the milestone.
    #[account(
        mut,
        eph,
        seeds = [VOTE_SEED, milestone.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct InitVotePermission<'info> {
    #[account(
        mut,
        seeds = [MILESTONE_SEED, milestone.startup.as_ref(), &milestone.milestone_id.to_le_bytes()],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [VOTE_SEED, milestone.key().as_ref(), vote.voter.as_ref()],
        constraint = vote.milestone == milestone.key() @ ErrorCode::InvalidVote,
        bump = vote.bump
    )]
    pub vote: Account<'info, Vote>,
    #[account(mut)]
    /// CHECK: Verified by the Permission Program.
    pub vote_permission: UncheckedAccount<'info>,
    #[account(address = PERMISSION_PROGRAM_ID)]
    /// CHECK: Fixed Permission Program id.
    pub permission_program: UncheckedAccount<'info>,
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    /// CHECK: Verified by the Magic Program.
    pub ephemeral_vault: UncheckedAccount<'info>,
    #[account(address = MAGIC_PROGRAM_ID)]
    /// CHECK: Fixed Magic Program id.
    pub magic_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct RevealMilestone<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        mut,
        seeds = [MILESTONE_SEED, milestone.startup.as_ref(), &milestone_id.to_le_bytes()],
        has_one = startup,
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
}

#[vrf]
#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct RequestMilestoneRandomness<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        seeds = [MILESTONE_SEED, milestone.startup.as_ref(), &milestone_id.to_le_bytes()],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    /// CHECK: validated by the ephemeral VRF program when it processes the request
    #[account(mut)]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback]
#[derive(Accounts)]
pub struct MilestoneRandomnessCallbackCtx<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
}

#[ephemeral_accounts]
#[derive(Accounts)]
pub struct SettleVote<'info> {
    #[account(mut)]
    /// CHECK: Voter identity is verified against the Vote account; credited directly with any reward.
    pub voter: UncheckedAccount<'info>,
    #[account(
        mut,
        sponsor,
        seeds = [MILESTONE_SEED, milestone.startup.as_ref(), &milestone.milestone_id.to_le_bytes()],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    /// CHECK: Ephemeral vote PDA sponsored by the milestone.
    #[account(
        mut,
        eph,
        seeds = [
            VOTE_SEED,
            milestone.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub vote: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Verified by the Permission Program.
    pub vote_permission: UncheckedAccount<'info>,
    #[account(address = PERMISSION_PROGRAM_ID)]
    /// CHECK: Fixed Permission Program id.
    pub permission_program: UncheckedAccount<'info>,
    #[account(address = MAGIC_PROGRAM_ID)]
    /// CHECK: Fixed Magic Program id.
    pub magic_program: UncheckedAccount<'info>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct DelegateMilestone<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        mut,
        del,
        seeds = [MILESTONE_SEED, startup.key().as_ref(), &milestone_id.to_le_bytes()],
        bump
    )]
    /// CHECK: Delegated account is deserialized by later ER instructions.
    pub milestone: UncheckedAccount<'info>,
    /// CHECK: Checked by the delegation program.
    pub validator: Option<UncheckedAccount<'info>>,
}

#[commit]
#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct UndelegateMilestone<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [MILESTONE_SEED, milestone.startup.as_ref(), &milestone_id.to_le_bytes()],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
}

#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct MilestonePermission<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        mut,
        seeds = [MILESTONE_SEED, startup.key().as_ref(), &milestone_id.to_le_bytes()],
        has_one = startup,
        bump
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [PERMISSION_SEED, milestone.key().as_ref()],
        bump,
        seeds::program = PERMISSION_PROGRAM_ID
    )]
    /// CHECK: Verified by the Permission Program.
    pub permission: UncheckedAccount<'info>,
    #[account(address = PERMISSION_PROGRAM_ID)]
    /// CHECK: Fixed Permission Program id.
    pub permission_program: UncheckedAccount<'info>,
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    /// CHECK: Verified by the Magic Program.
    pub ephemeral_vault: UncheckedAccount<'info>,
    #[account(address = MAGIC_PROGRAM_ID)]
    /// CHECK: Fixed Magic Program id.
    pub magic_program: UncheckedAccount<'info>,
}
