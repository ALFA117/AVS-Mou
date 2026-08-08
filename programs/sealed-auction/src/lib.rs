//! AVS sealed-bid deal auction.
//!
//! Forked from MagicBlock's `sealed-auction` example (see
//! `vendor/magicblock-engine-examples/sealed-auction`). The privacy model is
//! unchanged: bid *amounts* are never encrypted client-side — they're hidden
//! by MagicBlock's private Ephemeral Rollup Permissions (PER), which restrict
//! which signers can even read a `Bid` account's data on the ER until we
//! explicitly reveal it. "Sealed" means access-controlled, not ciphertext.
//!
//! Domain changes vs. the original auction:
//! - Single winner-take-all -> every bidder becomes a syndicate member,
//!   proportional to their bid (no losers, no refunds).
//! - No pre-existing "lot" token escrowed by the seller — a deal sells a
//!   percentage of the company (`equity_bps`), not a fixed token amount.
//! - Equity *token* minting is intentionally out of scope here — this
//!   program only computes and emits each bidder's equity allocation
//!   (`BidSettled` event). Actual SPL minting/distribution is the
//!   `spl-token-manager` program's job (AVS_100_TASKS.md tasks 036-040),
//!   which reads these events / bid records to mint the real tokens.
//!
//! `place_bid` accepts an optional session key (see
//! `docs/SESSION_KEYS.md` and AVS_100_TASKS.md tasks 041-050): once an
//! investor authorizes a session with their real wallet, every subsequent
//! bid can be signed by the disposable session keypair instead — no wallet
//! popup per bid. The `investor` argument is always the real wallet's
//! identity (recorded as `bid.bidder`); `bidder` is *whoever signed* (the
//! real wallet directly, or a session signer authorized for it), verified
//! by `#[session_auth_or]` below. Moving the investor's funding tokens
//! still requires the investor to have SPL-`approve`d the session signer
//! as a delegate beforehand — this program only gates who may *call*
//! `place_bid`, not SPL's own authority checks on the transfer CPI.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};
use anchor_lang::system_program::{transfer as transfer_lamports, Transfer as LamportsTransfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as SplTransfer};
use ephemeral_rollups_sdk::{
    access_control::{
        instructions::{CloseEphemeralPermissionCpi, CreateEphemeralPermissionCpi},
        structs::{
            EphemeralMembersArgs, EphemeralPermission, Member, AUTHORITY_FLAG, PERMISSION_SEED,
            TX_BALANCES_FLAG, TX_LOGS_FLAG, TX_MESSAGE_FLAG,
        },
    },
    anchor::{commit, delegate, ephemeral, ephemeral_accounts},
    consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID},
    cpi::DelegateConfig,
    ephem::MagicIntentBundleBuilder,
};
use session_keys::SessionTokenV2;

mod error;
mod state;

use error::ErrorCode;
use state::{Bid, Deal, DealStatus, BPS_DENOMINATOR, EQUITY_TOTAL_SUPPLY, MAX_BIDDERS};

declare_id!("Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo");

pub const DEAL_SEED: &[u8] = b"deal";
pub const BID_SEED: &[u8] = b"bid";
pub const EPHEMERAL_SPL_TOKEN_PROGRAM_ID: Pubkey =
    pubkey!("SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2");
pub const DELEGATION_PROGRAM_ID: Pubkey = pubkey!("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const INIT_EPHEMERAL_ATA_DISCRIMINATOR: u8 = 0;
const DELEGATE_EPHEMERAL_ATA_DISCRIMINATOR: u8 = 4;

#[ephemeral]
#[program]
pub mod sealed_auction {
    use super::*;

    #[allow(clippy::too_many_arguments)]
    pub fn initialize_deal(
        ctx: Context<InitializeDeal>,
        deal_id: u64,
        valuation: u64,
        equity_bps: u16,
        min_investment: u64,
        max_cap: u64,
        deadline_ts: i64,
        cliff_months: u16,
        vesting_months: u16,
        sponsor_lamports: u64,
    ) -> Result<()> {
        require!(
            equity_bps > 0 && equity_bps as u64 <= BPS_DENOMINATOR,
            ErrorCode::InvalidEquityBps
        );
        require!(min_investment > 0, ErrorCode::InvalidAmount);
        require!(max_cap >= min_investment, ErrorCode::InvalidAmount);
        require!(
            deadline_ts > Clock::get()?.unix_timestamp,
            ErrorCode::DeadlineInPast
        );

        transfer_lamports(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                LamportsTransfer {
                    from: ctx.accounts.startup.to_account_info(),
                    to: ctx.accounts.deal.to_account_info(),
                },
            ),
            ephemeral_rollups_sdk::ephemeral_accounts::rent(EphemeralPermission::size_of(
                MAX_BIDDERS + 1,
            ) as u32)
            .checked_add(sponsor_lamports)
            .ok_or(ErrorCode::InvalidAmount)?,
        )?;

        let deal_key = ctx.accounts.deal.key();
        let deal = &mut ctx.accounts.deal;
        deal.startup = ctx.accounts.startup.key();
        deal.deal_id = deal_id;
        deal.funding_mint = ctx.accounts.funding_mint.key();
        deal.valuation = valuation;
        deal.equity_bps = equity_bps;
        deal.min_investment = min_investment;
        deal.max_cap = max_cap;
        deal.deadline_ts = deadline_ts;
        deal.bid_count = 0;
        deal.closed_bid_count = 0;
        deal.total_raised = 0;
        deal.status = DealStatus::Open;
        deal.oversubscribed = false;
        deal.cliff_months = cliff_months;
        deal.vesting_months = vesting_months;
        deal.bump = ctx.bumps.deal;

        let validator = ctx.accounts.validator.as_ref().map(|v| v.key());
        init_ephemeral_ata(
            &ctx.accounts.ephemeral_token_program,
            &ctx.accounts.deal_funding_ephemeral_ata,
            ctx.accounts.deal.to_account_info(),
            &ctx.accounts.funding_mint,
            &ctx.accounts.startup,
            &ctx.accounts.system_program,
        )?;
        delegate_ephemeral_ata(
            &ctx.accounts.ephemeral_token_program,
            &ctx.accounts.startup,
            &ctx.accounts.deal_funding_ephemeral_ata,
            &ctx.accounts.deal_funding_eata_buffer,
            &ctx.accounts.deal_funding_eata_record,
            &ctx.accounts.deal_funding_eata_metadata,
            &ctx.accounts.delegation_program,
            &ctx.accounts.system_program,
            validator,
        )?;

        emit!(DealCreated {
            deal: deal_key,
            startup: ctx.accounts.startup.key(),
            deal_id,
            equity_bps,
            min_investment,
            max_cap,
            deadline_ts,
        });
        msg!(
            "Initialized deal {} — {}bps equity, min investment {}",
            deal_key,
            equity_bps,
            min_investment
        );
        Ok(())
    }

    pub fn delegate_deal(ctx: Context<DelegateDeal>, deal_id: u64) -> Result<()> {
        let validator = ctx.accounts.validator.as_ref().map(|v| v.key());
        let startup = ctx.accounts.startup.key();
        let deal_id_bytes = deal_id.to_le_bytes();
        ctx.accounts.delegate_deal(
            &ctx.accounts.startup,
            &[DEAL_SEED, startup.as_ref(), &deal_id_bytes],
            DelegateConfig {
                validator,
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn init_deal_permission(ctx: Context<DealPermission>, deal_id: u64) -> Result<()> {
        require_eq!(ctx.accounts.deal.deal_id, deal_id);
        if ctx.accounts.permission.lamports() > 0 {
            msg!("Deal permission already exists");
            return Ok(());
        }

        let deal_id_bytes = ctx.accounts.deal.deal_id.to_le_bytes();
        let bump = [ctx.bumps.deal];
        let signers: &[&[u8]] = &[
            DEAL_SEED,
            ctx.accounts.deal.startup.as_ref(),
            &deal_id_bytes,
            &bump,
        ];
        let members = vec![permission_member(ctx.accounts.deal.startup)];

        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.deal.to_account_info(),
            permissioned_account: ctx.accounts.deal.to_account_info(),
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

    /// Place a sealed bid. The amount is stored on an ER-only (`eph`) account
    /// sponsored by the deal; nothing about the amount is ever logged or
    /// emitted here, so it stays invisible until `settle_bid` runs post-reveal.
    ///
    /// `investor` is the real wallet this bid belongs to. `bidder` (the
    /// signer) must either *be* `investor` directly, or hold a valid,
    /// unexpired session token authorizing it to sign for `investor` — see
    /// the module docs and `docs/SESSION_KEYS.md`. The `session_token`
    /// account's PDA seeds (checked via the `#[account(seeds = ...)]`
    /// constraint below) already prove it was minted for exactly this
    /// (program, bidder, investor) triple; only expiry needs a runtime check.
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        deal_id: u64,
        investor: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let session_valid = match &ctx.accounts.session_token {
            Some(token) => !token.is_expired()?,
            None => false,
        };
        require!(
            ctx.accounts.bidder.key() == investor || session_valid,
            ErrorCode::InvalidSession
        );

        require_eq!(ctx.accounts.deal.deal_id, deal_id);
        require!(
            ctx.accounts.deal.status == DealStatus::Open,
            ErrorCode::DealClosed
        );
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.deal.deadline_ts,
            ErrorCode::DealClosed
        );
        require!(
            amount >= ctx.accounts.deal.min_investment,
            ErrorCode::BelowMinInvestment
        );
        require!(
            (ctx.accounts.deal.bid_count as usize) < MAX_BIDDERS,
            ErrorCode::TooManyBidders
        );

        let deal_key = ctx.accounts.deal.key();

        ctx.accounts.create_ephemeral_bid((8 + Bid::LEN) as u32)?;

        // Authority is whoever signed (`bidder`) — the real wallet, or a
        // session signer the investor has SPL-approved as a delegate on
        // this token account. Session validity for *calling this
        // instruction* was already enforced above by #[session_auth_or];
        // this is a separate, standard SPL delegate check.
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                SplTransfer {
                    from: ctx.accounts.bidder_funding_account.to_account_info(),
                    to: ctx.accounts.deal_funding_account.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            amount,
        )?;

        let bidder_index = ctx.accounts.deal.bid_count;
        let bid = Bid {
            deal: deal_key,
            bidder: investor,
            amount,
            bidder_index,
            escrow: ctx.accounts.deal_funding_account.key(),
            equity_allocated: 0,
            bump: ctx.bumps.bid,
        };
        write_bid(&ctx.accounts.bid.to_account_info(), &bid)?;

        ctx.accounts.deal.bid_count = bidder_index + 1;

        emit!(BidPlaced {
            deal: deal_key,
            bidder: investor,
            bidder_index,
        });
        msg!("Sealed bid placed for deal {}", deal_key);
        Ok(())
    }

    pub fn init_bid_permission(ctx: Context<InitBidPermission>, deal_id: u64) -> Result<()> {
        require_eq!(ctx.accounts.deal.deal_id, deal_id);
        require_keys_eq!(
            ctx.accounts.bid.deal,
            ctx.accounts.deal.key(),
            ErrorCode::InvalidBid
        );
        if !ctx.accounts.bid_permission.data_is_empty() {
            msg!("Bid permission already exists");
            return Ok(());
        }

        let deal_id_bytes = ctx.accounts.deal.deal_id.to_le_bytes();
        let deal_bump = [ctx.accounts.deal.bump];
        let deal_signers: &[&[u8]] = &[
            DEAL_SEED,
            ctx.accounts.deal.startup.as_ref(),
            &deal_id_bytes,
            &deal_bump,
        ];
        let deal_key = ctx.accounts.deal.key();
        let bid_bump = [ctx.accounts.bid.bump];
        let bid_signers: &[&[u8]] = &[
            BID_SEED,
            deal_key.as_ref(),
            ctx.accounts.bid.bidder.as_ref(),
            &bid_bump,
        ];
        // is_private: true is what actually seals the bid — only the startup
        // and the bidder can read this account's data on the ER until closed.
        let bid_members = vec![
            permission_member(ctx.accounts.deal.startup),
            permission_member(ctx.accounts.bid.bidder),
        ];
        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.deal.to_account_info(),
            permissioned_account: ctx.accounts.bid.to_account_info(),
            permission: ctx.accounts.bid_permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: bid_members,
            },
        }
        .invoke_signed(&[deal_signers, bid_signers])?;

        msg!("Bid permission created for {}", ctx.accounts.bid.key());
        Ok(())
    }

    /// The reveal: after the deadline, scan every bid account (now readable
    /// since we're past the deadline the permission model gates on) and sum
    /// them. No single "winner" — every accepted bid becomes a syndicate
    /// position, sized in `settle_bid`.
    pub fn reveal_deal(ctx: Context<RevealDeal>, deal_id: u64) -> Result<()> {
        require_eq!(ctx.accounts.deal.deal_id, deal_id);
        require!(
            ctx.accounts.deal.status == DealStatus::Open,
            ErrorCode::DealClosed
        );
        require!(
            Clock::get()?.unix_timestamp >= ctx.accounts.deal.deadline_ts,
            ErrorCode::DealStillOpen
        );

        let deal_key = ctx.accounts.deal.key();
        let bid_count = ctx.accounts.deal.bid_count as usize;
        require!(
            ctx.remaining_accounts.len() == bid_count,
            ErrorCode::MissingBid
        );

        let mut total_raised: u64 = 0;
        for index in 0..bid_count {
            let bid_info = &ctx.remaining_accounts[index];
            let bid = Account::<Bid>::try_from(bid_info)?;
            require_keys_eq!(bid.deal, deal_key, ErrorCode::InvalidBid);
            let expected_bid = Pubkey::find_program_address(
                &[BID_SEED, deal_key.as_ref(), bid.bidder.as_ref()],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(bid_info.key(), expected_bid, ErrorCode::InvalidBid);
            require!(
                (bid.bidder_index as usize) < bid_count,
                ErrorCode::InvalidBid
            );

            for previous_index in 0..index {
                let previous_info = &ctx.remaining_accounts[previous_index];
                require_keys_neq!(bid_info.key(), previous_info.key(), ErrorCode::DuplicateBid);
                let previous_bid = Account::<Bid>::try_from(previous_info)?;
                require!(
                    bid.bidder_index != previous_bid.bidder_index,
                    ErrorCode::DuplicateBid
                );
            }

            total_raised = total_raised
                .checked_add(bid.amount)
                .ok_or(ErrorCode::EquityMathOverflow)?;
        }

        let deal = &mut ctx.accounts.deal;
        deal.total_raised = total_raised;
        deal.oversubscribed = total_raised > deal.max_cap;
        deal.status = DealStatus::Revealed;

        emit!(DealRevealed {
            deal: deal_key,
            bid_count: bid_count as u8,
            total_raised,
            oversubscribed: deal.oversubscribed,
        });
        msg!(
            "Revealed deal {} — {} bids, {} raised",
            deal_key,
            bid_count,
            total_raised
        );
        Ok(())
    }

    /// Runs once per bid after reveal: computes that bidder's proportional
    /// equity share, forwards their payment to the startup, and closes the
    /// (now-settled) sealed bid account. No refunds — every accepted bid
    /// becomes a syndicate position, sized by its share of `total_raised`.
    pub fn settle_bid(ctx: Context<SettleBid>) -> Result<()> {
        require!(
            ctx.accounts.deal.status == DealStatus::Revealed,
            ErrorCode::DealNotRevealed
        );

        let deal_key = ctx.accounts.deal.key();
        let bid_info = ctx.accounts.bid.to_account_info();
        let bid = read_bid(&bid_info)?;
        require_keys_eq!(bid.deal, deal_key, ErrorCode::InvalidBid);
        require_keys_eq!(bid.bidder, ctx.accounts.bidder.key(), ErrorCode::InvalidBid);
        require_keys_eq!(
            bid.escrow,
            ctx.accounts.deal_funding_account.key(),
            ErrorCode::InvalidBidEscrow
        );

        let total_raised = ctx.accounts.deal.total_raised;
        require!(total_raised > 0, ErrorCode::EquityMathOverflow);
        let equity_bps = ctx.accounts.deal.equity_bps as u128;

        // equity = amount/total_raised * equity_bps/10_000 * EQUITY_TOTAL_SUPPLY
        let equity_allocated: u64 = (bid.amount as u128)
            .checked_mul(equity_bps)
            .and_then(|v| v.checked_mul(EQUITY_TOTAL_SUPPLY as u128))
            .and_then(|v| v.checked_div(total_raised as u128))
            .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
            .ok_or(ErrorCode::EquityMathOverflow)?
            .try_into()
            .map_err(|_| ErrorCode::EquityMathOverflow)?;

        let deal_id_bytes = ctx.accounts.deal.deal_id.to_le_bytes();
        let deal_bump = [ctx.accounts.deal.bump];
        let deal_signers: &[&[u8]] = &[
            DEAL_SEED,
            ctx.accounts.deal.startup.as_ref(),
            &deal_id_bytes,
            &deal_bump,
        ];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                SplTransfer {
                    from: ctx.accounts.deal_funding_account.to_account_info(),
                    to: ctx.accounts.startup_funding_account.to_account_info(),
                    authority: ctx.accounts.deal.to_account_info(),
                },
                &[deal_signers],
            ),
            bid.amount,
        )?;

        let bid_bump = [bid.bump];
        let bid_seeds: &[&[u8]] = &[BID_SEED, bid.deal.as_ref(), bid.bidder.as_ref(), &bid_bump];
        close_bid_permission(&CloseBidPermissionAccounts {
            sponsor: ctx.accounts.deal.to_account_info(),
            bid: ctx.accounts.bid.to_account_info(),
            permission: ctx.accounts.bid_permission.to_account_info(),
            ephemeral_vault: ctx.accounts.vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            sponsor_signers: deal_signers,
            bid_signers: bid_seeds,
        })?;
        ctx.accounts.close_ephemeral_bid()?;

        ctx.accounts.deal.closed_bid_count = ctx
            .accounts
            .deal
            .closed_bid_count
            .checked_add(1)
            .ok_or(ErrorCode::TooManyBidders)?;

        emit!(BidSettled {
            deal: deal_key,
            bidder: bid.bidder,
            amount: bid.amount,
            equity_allocated,
        });
        Ok(())
    }

    pub fn undelegate_deal(ctx: Context<UndelegateDeal>, deal_id: u64) -> Result<()> {
        require_eq!(ctx.accounts.deal.deal_id, deal_id);
        require!(
            ctx.accounts.deal.status == DealStatus::Revealed,
            ErrorCode::DealNotRevealed
        );
        require_eq!(
            ctx.accounts.deal.closed_bid_count,
            ctx.accounts.deal.bid_count,
            ErrorCode::UnsettledBids
        );

        let deal_key = ctx.accounts.deal.key();
        let total_raised = ctx.accounts.deal.total_raised;
        let bid_count = ctx.accounts.deal.bid_count;

        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.deal.to_account_info()])
        .build_and_invoke()?;

        ctx.accounts.deal.status = DealStatus::Settled;

        emit!(DealSettled {
            deal: deal_key,
            total_raised,
            bid_count,
        });
        msg!(
            "Deal {} settled — {} bidders, {} raised",
            deal_key,
            bid_count,
            total_raised
        );
        Ok(())
    }
}

#[event]
pub struct DealCreated {
    pub deal: Pubkey,
    pub startup: Pubkey,
    pub deal_id: u64,
    pub equity_bps: u16,
    pub min_investment: u64,
    pub max_cap: u64,
    pub deadline_ts: i64,
}

#[event]
pub struct BidPlaced {
    pub deal: Pubkey,
    pub bidder: Pubkey,
    pub bidder_index: u8,
}

#[event]
pub struct DealRevealed {
    pub deal: Pubkey,
    pub bid_count: u8,
    pub total_raised: u64,
    pub oversubscribed: bool,
}

#[event]
pub struct BidSettled {
    pub deal: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub equity_allocated: u64,
}

#[event]
pub struct DealSettled {
    pub deal: Pubkey,
    pub total_raised: u64,
    pub bid_count: u8,
}

fn permission_member(pubkey: Pubkey) -> Member {
    Member {
        flags: AUTHORITY_FLAG | TX_LOGS_FLAG | TX_MESSAGE_FLAG | TX_BALANCES_FLAG,
        pubkey,
    }
}

fn write_bid(account_info: &AccountInfo, bid: &Bid) -> Result<()> {
    let mut data = account_info.try_borrow_mut_data()?;
    bid.try_serialize(&mut &mut data[..])?;
    Ok(())
}

fn read_bid(account_info: &AccountInfo) -> Result<Bid> {
    let data = account_info.try_borrow_data()?;
    let mut cursor = &data[..];
    Bid::try_deserialize(&mut cursor)
}

fn init_ephemeral_ata<'info>(
    program: &UncheckedAccount<'info>,
    ephemeral_ata: &UncheckedAccount<'info>,
    owner: AccountInfo<'info>,
    mint: &Account<'info, Mint>,
    payer: &Signer<'info>,
    system_program: &Program<'info, System>,
) -> Result<()> {
    let instruction = Instruction {
        program_id: EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(ephemeral_ata.key(), false),
            AccountMeta::new(payer.key(), true),
            AccountMeta::new_readonly(owner.key(), false),
            AccountMeta::new_readonly(mint.key(), false),
            AccountMeta::new_readonly(system_program.key(), false),
        ],
        data: vec![INIT_EPHEMERAL_ATA_DISCRIMINATOR],
    };
    invoke(
        &instruction,
        &[
            ephemeral_ata.to_account_info(),
            payer.to_account_info(),
            owner,
            mint.to_account_info(),
            system_program.to_account_info(),
            program.to_account_info(),
        ],
    )?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn delegate_ephemeral_ata<'info>(
    program: &UncheckedAccount<'info>,
    payer: &Signer<'info>,
    ephemeral_ata: &UncheckedAccount<'info>,
    buffer: &UncheckedAccount<'info>,
    record: &UncheckedAccount<'info>,
    metadata: &UncheckedAccount<'info>,
    delegation_program: &UncheckedAccount<'info>,
    system_program: &Program<'info, System>,
    validator: Option<Pubkey>,
) -> Result<()> {
    let mut data = vec![DELEGATE_EPHEMERAL_ATA_DISCRIMINATOR];
    if let Some(validator) = validator {
        data.extend_from_slice(validator.as_ref());
    }

    let instruction = Instruction {
        program_id: EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(payer.key(), true),
            AccountMeta::new(ephemeral_ata.key(), false),
            AccountMeta::new_readonly(EPHEMERAL_SPL_TOKEN_PROGRAM_ID, false),
            AccountMeta::new(buffer.key(), false),
            AccountMeta::new(record.key(), false),
            AccountMeta::new(metadata.key(), false),
            AccountMeta::new_readonly(delegation_program.key(), false),
            AccountMeta::new_readonly(system_program.key(), false),
        ],
        data,
    };
    invoke(
        &instruction,
        &[
            payer.to_account_info(),
            ephemeral_ata.to_account_info(),
            program.to_account_info(),
            buffer.to_account_info(),
            record.to_account_info(),
            metadata.to_account_info(),
            delegation_program.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;
    Ok(())
}

fn ephemeral_ata_pda(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[owner.as_ref(), mint.as_ref()],
        &EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
    )
    .0
}

fn eata_buffer_address(delegated_account: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"buffer", delegated_account.as_ref()],
        &EPHEMERAL_SPL_TOKEN_PROGRAM_ID,
    )
    .0
}

fn record_pda(delegated_account: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"delegation", delegated_account.as_ref()],
        &DELEGATION_PROGRAM_ID,
    )
    .0
}

fn metadata_pda(delegated_account: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"delegation-metadata", delegated_account.as_ref()],
        &DELEGATION_PROGRAM_ID,
    )
    .0
}

struct CloseBidPermissionAccounts<'a, 'info> {
    sponsor: AccountInfo<'info>,
    bid: AccountInfo<'info>,
    permission: AccountInfo<'info>,
    ephemeral_vault: AccountInfo<'info>,
    magic_program: AccountInfo<'info>,
    permission_program: AccountInfo<'info>,
    sponsor_signers: &'a [&'a [u8]],
    bid_signers: &'a [&'a [u8]],
}

fn close_bid_permission(accounts: &CloseBidPermissionAccounts<'_, '_>) -> Result<()> {
    CloseEphemeralPermissionCpi {
        payer: accounts.sponsor.clone(),
        authority: accounts.bid.clone(),
        permissioned_account: accounts.bid.clone(),
        permission: accounts.permission.clone(),
        vault: accounts.ephemeral_vault.clone(),
        magic_program: accounts.magic_program.clone(),
        permission_program: accounts.permission_program.clone(),
        authority_is_signer: false,
    }
    .invoke_signed(&[accounts.sponsor_signers, accounts.bid_signers])?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(deal_id: u64)]
pub struct InitializeDeal<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    pub funding_mint: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = startup,
        space = 8 + Deal::LEN,
        seeds = [DEAL_SEED, startup.key().as_ref(), &deal_id.to_le_bytes()],
        bump
    )]
    pub deal: Box<Account<'info, Deal>>,
    #[account(
        init,
        payer = startup,
        associated_token::mint = funding_mint,
        associated_token::authority = deal
    )]
    pub deal_funding_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = deal_funding_ephemeral_ata.key() == ephemeral_ata_pda(&deal.key(), &funding_mint.key()) @ ErrorCode::InvalidBidEscrow
    )]
    /// CHECK: Deal PDA's e-token balance account for the funding mint.
    pub deal_funding_ephemeral_ata: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = deal_funding_eata_buffer.key() == eata_buffer_address(&deal_funding_ephemeral_ata.key()) @ ErrorCode::InvalidBidEscrow
    )]
    /// CHECK: Delegation buffer PDA for the deal funding eATA.
    pub deal_funding_eata_buffer: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = deal_funding_eata_record.key() == record_pda(&deal_funding_ephemeral_ata.key()) @ ErrorCode::InvalidBidEscrow
    )]
    /// CHECK: Delegation record PDA for the deal funding eATA.
    pub deal_funding_eata_record: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = deal_funding_eata_metadata.key() == metadata_pda(&deal_funding_ephemeral_ata.key()) @ ErrorCode::InvalidBidEscrow
    )]
    /// CHECK: Delegation metadata PDA for the deal funding eATA.
    pub deal_funding_eata_metadata: UncheckedAccount<'info>,
    #[account(address = EPHEMERAL_SPL_TOKEN_PROGRAM_ID)]
    /// CHECK: Fixed Ephemeral SPL Token program id.
    pub ephemeral_token_program: UncheckedAccount<'info>,
    #[account(address = DELEGATION_PROGRAM_ID)]
    /// CHECK: Fixed delegation program id.
    pub delegation_program: UncheckedAccount<'info>,
    /// CHECK: Optional ER validator account used by the e-token delegation CPI.
    pub validator: Option<UncheckedAccount<'info>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Payer must equal the deal's startup — mirrors the vendor sealed-auction's
/// sponsor pattern (the deal PDA sponsors the bid account's rent, and the
/// CPI that authorizes that charge is signed against this identity). In
/// production this would be a relay wallet the startup's backend controls,
/// so bidders can sign with session keys without holding SOL for rent.
#[ephemeral_accounts]
#[derive(Accounts)]
#[instruction(deal_id: u64, investor: Pubkey)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The real investor wallet directly, or a session signer authorized
    /// for it — validated against `session_token` in `place_bid`.
    pub bidder: Signer<'info>,
    /// Its PDA seeds bind it to exactly this (program, bidder, investor)
    /// triple — see `docs/SESSION_KEYS.md`. Anchor's `seeds`/`bump`
    /// constraint rejects the account entirely if it doesn't match, so
    /// `place_bid` only needs to check expiry at runtime.
    #[account(
        seeds = [
            SessionTokenV2::SEED_PREFIX.as_bytes(),
            crate::ID.as_ref(),
            bidder.key().as_ref(),
            investor.as_ref(),
        ],
        bump,
        seeds::program = session_keys::ID
    )]
    pub session_token: Option<Account<'info, SessionTokenV2>>,
    pub funding_mint: Account<'info, Mint>,
    #[account(
        mut,
        sponsor,
        seeds = [DEAL_SEED, deal.startup.as_ref(), &deal.deal_id.to_le_bytes()],
        constraint = deal.startup == payer.key() @ ErrorCode::InvalidBid,
        constraint = deal.funding_mint == funding_mint.key() @ ErrorCode::MintMismatch,
        bump = deal.bump
    )]
    pub deal: Account<'info, Deal>,
    /// CHECK: Ephemeral bid PDA sponsored by the deal.
    #[account(
        mut,
        eph,
        seeds = [BID_SEED, deal.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = bidder_funding_account.owner == investor @ ErrorCode::InvalidTokenOwner,
        constraint = bidder_funding_account.mint == funding_mint.key() @ ErrorCode::MintMismatch
    )]
    pub bidder_funding_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        token::mint = funding_mint,
        token::authority = deal
    )]
    pub deal_funding_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(deal_id: u64)]
pub struct InitBidPermission<'info> {
    #[account(
        mut,
        seeds = [DEAL_SEED, deal.startup.as_ref(), &deal.deal_id.to_le_bytes()],
        bump = deal.bump
    )]
    pub deal: Account<'info, Deal>,
    #[account(
        mut,
        seeds = [BID_SEED, deal.key().as_ref(), bid.bidder.as_ref()],
        constraint = bid.deal == deal.key() @ ErrorCode::InvalidBid,
        bump = bid.bump
    )]
    pub bid: Account<'info, Bid>,
    #[account(mut)]
    /// CHECK: Verified by the Permission Program.
    pub bid_permission: UncheckedAccount<'info>,
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
#[instruction(deal_id: u64)]
pub struct RevealDeal<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        mut,
        seeds = [DEAL_SEED, deal.startup.as_ref(), &deal_id.to_le_bytes()],
        has_one = startup,
        bump = deal.bump
    )]
    pub deal: Account<'info, Deal>,
}

#[commit]
#[derive(Accounts)]
#[instruction(deal_id: u64)]
pub struct UndelegateDeal<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [DEAL_SEED, deal.startup.as_ref(), &deal_id.to_le_bytes()],
        bump = deal.bump
    )]
    pub deal: Account<'info, Deal>,
}

#[ephemeral_accounts]
#[derive(Accounts)]
pub struct SettleBid<'info> {
    /// CHECK: Bidder identity is verified against the Bid account and token destination authority.
    pub bidder: UncheckedAccount<'info>,
    #[account(
        mut,
        sponsor,
        seeds = [DEAL_SEED, deal.startup.as_ref(), &deal.deal_id.to_le_bytes()],
        bump = deal.bump
    )]
    pub deal: Account<'info, Deal>,
    /// CHECK: Ephemeral bid PDA sponsored by the deal.
    #[account(
        mut,
        eph,
        seeds = [
            BID_SEED,
            deal.key().as_ref(),
            bidder.key().as_ref()
        ],
        bump
    )]
    pub bid: UncheckedAccount<'info>,
    #[account(constraint = funding_mint.key() == deal.funding_mint @ ErrorCode::MintMismatch)]
    pub funding_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = funding_mint,
        token::authority = deal
    )]
    pub deal_funding_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = funding_mint,
        token::authority = deal.startup
    )]
    pub startup_funding_account: Account<'info, TokenAccount>,
    #[account(mut)]
    /// CHECK: Verified by the Permission Program.
    pub bid_permission: UncheckedAccount<'info>,
    #[account(address = PERMISSION_PROGRAM_ID)]
    /// CHECK: Fixed Permission Program id.
    pub permission_program: UncheckedAccount<'info>,
    #[account(address = MAGIC_PROGRAM_ID)]
    /// CHECK: Fixed Magic Program id.
    pub magic_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(deal_id: u64)]
pub struct DelegateDeal<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        mut,
        del,
        seeds = [DEAL_SEED, startup.key().as_ref(), &deal_id.to_le_bytes()],
        bump
    )]
    /// CHECK: Delegated account is deserialized by later ER instructions.
    pub deal: UncheckedAccount<'info>,
    /// CHECK: Checked by the delegation program.
    pub validator: Option<UncheckedAccount<'info>>,
}

#[derive(Accounts)]
#[instruction(deal_id: u64)]
pub struct DealPermission<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        mut,
        seeds = [DEAL_SEED, startup.key().as_ref(), &deal_id.to_le_bytes()],
        has_one = startup,
        bump
    )]
    pub deal: Account<'info, Deal>,
    #[account(
        mut,
        seeds = [PERMISSION_SEED, deal.key().as_ref()],
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
