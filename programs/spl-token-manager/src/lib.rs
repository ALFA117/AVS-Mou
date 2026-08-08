//! AVS equity SPL token manager.
//!
//! Forked from MagicBlock's minimal `spl-tokens` example (see
//! `vendor/magicblock-engine-examples/spl-tokens`), which is just a
//! gasless-transfer wrapper around the standard Token Program. This program
//! adds equity mint creation and delegates the same ephemeral-ATA pattern
//! `sealed-auction` uses for its funding-token escrow (see that program's
//! `init_ephemeral_ata`/`delegate_ephemeral_ata` — copied here verbatim,
//! they're generic, not deal-specific).
//!
//! Consumes `sealed-auction`'s `BidSettled` events (deal_id, bidder, amount,
//! equity_allocated) off-chain to drive `mint_equity` calls — see that
//! program's README for why equity minting was split out into its own
//! program instead of happening inline during bid settlement.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer as SplTransfer};
use ephemeral_rollups_sdk::{
    anchor::{commit, ephemeral},
    consts::MAGIC_PROGRAM_ID,
    ephem::MagicIntentBundleBuilder,
};

mod error;
mod state;

use error::ErrorCode;
use state::Syndicate;

declare_id!("fNkSCkp2szKMND8ouKwfxNpGqhAsnCdQ4PTzsxnDKa3");

pub const SYNDICATE_SEED: &[u8] = b"syndicate";
pub const EQUITY_DECIMALS: u8 = 6;
pub const EPHEMERAL_SPL_TOKEN_PROGRAM_ID: Pubkey =
    pubkey!("SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2");
pub const DELEGATION_PROGRAM_ID: Pubkey = pubkey!("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const INIT_EPHEMERAL_ATA_DISCRIMINATOR: u8 = 0;
const DELEGATE_EPHEMERAL_ATA_DISCRIMINATOR: u8 = 4;

#[ephemeral]
#[program]
pub mod spl_token_manager {
    use super::*;

    /// Creates the equity mint for a revealed deal. `deal` is the
    /// sealed-auction Deal PDA's address, used only to derive this
    /// program's Syndicate PDA — no CPI back into sealed-auction.
    pub fn create_syndicate(ctx: Context<CreateSyndicate>, deal: Pubkey) -> Result<()> {
        let syndicate_key = ctx.accounts.syndicate.key();
        let equity_mint = ctx.accounts.equity_mint.key();
        let startup = ctx.accounts.startup.key();

        ctx.accounts.syndicate.deal = deal;
        ctx.accounts.syndicate.startup = startup;
        ctx.accounts.syndicate.equity_mint = equity_mint;
        ctx.accounts.syndicate.member_count = 0;
        ctx.accounts.syndicate.total_minted = 0;
        ctx.accounts.syndicate.bump = ctx.bumps.syndicate;

        emit!(SyndicateCreated {
            syndicate: syndicate_key,
            deal,
            startup,
            equity_mint,
        });
        msg!("Created syndicate {} for deal {}", syndicate_key, deal);
        Ok(())
    }

    /// Mints `amount` equity tokens to `member`'s associated token account.
    /// Startup-authorized only — see programs/spl-token-manager/README.md
    /// for the trust boundary (this doesn't verify the amount against
    /// sealed-auction's on-chain `BidSettled` record).
    pub fn mint_equity(ctx: Context<MintEquity>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let deal = ctx.accounts.syndicate.deal;
        let syndicate_bump = [ctx.accounts.syndicate.bump];
        let syndicate_signers: &[&[u8]] = &[SYNDICATE_SEED, deal.as_ref(), &syndicate_bump];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.equity_mint.to_account_info(),
                    to: ctx.accounts.member_equity_account.to_account_info(),
                    authority: ctx.accounts.syndicate.to_account_info(),
                },
                &[syndicate_signers],
            ),
            amount,
        )?;

        let syndicate_key = ctx.accounts.syndicate.key();
        let member = ctx.accounts.member.key();
        ctx.accounts.syndicate.member_count = ctx
            .accounts
            .syndicate
            .member_count
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        ctx.accounts.syndicate.total_minted = ctx
            .accounts
            .syndicate
            .total_minted
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(EquityMinted {
            syndicate: syndicate_key,
            member,
            amount,
        });
        msg!("Minted {} equity to {}", amount, member);
        Ok(())
    }

    /// Delegates a member's equity ATA to the ER so subsequent
    /// `transfer_equity` calls against it are gasless when sent to the ER RPC.
    pub fn delegate_equity_account(ctx: Context<DelegateEquityAccount>) -> Result<()> {
        let validator = ctx.accounts.validator.as_ref().map(|v| v.key());
        init_ephemeral_ata(
            &ctx.accounts.ephemeral_token_program,
            &ctx.accounts.member_equity_ephemeral_ata,
            ctx.accounts.member.to_account_info(),
            &ctx.accounts.equity_mint,
            &ctx.accounts.member,
            &ctx.accounts.system_program,
        )?;
        delegate_ephemeral_ata(
            &ctx.accounts.ephemeral_token_program,
            &ctx.accounts.member,
            &ctx.accounts.member_equity_ephemeral_ata,
            &ctx.accounts.member_equity_eata_buffer,
            &ctx.accounts.member_equity_eata_record,
            &ctx.accounts.member_equity_eata_metadata,
            &ctx.accounts.delegation_program,
            &ctx.accounts.system_program,
            validator,
        )?;
        msg!(
            "Delegated equity account for {} to the ER",
            ctx.accounts.member.key()
        );
        Ok(())
    }

    /// Plain SPL transfer between two equity token accounts. Identical
    /// whether both are still on L1 or have been delegated to the ER —
    /// "gasless" comes from sending this transaction to the ER RPC against
    /// delegated accounts, not from anything special in this instruction
    /// (mirrors the upstream `spl-tokens` example exactly).
    pub fn transfer_equity(ctx: Context<TransferEquity>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                SplTransfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(EquityTransferred {
            from: ctx.accounts.from.key(),
            to: ctx.accounts.to.key(),
            amount,
        });
        Ok(())
    }

    /// Commits a delegated equity account's ER state back to L1.
    pub fn undelegate_equity_account(ctx: Context<UndelegateEquityAccount>) -> Result<()> {
        let equity_account_key = ctx.accounts.equity_account.key();
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.equity_account.to_account_info()])
        .build_and_invoke()?;

        emit!(SettlementComplete {
            equity_account: equity_account_key,
        });
        msg!("Settled equity account {} to L1", equity_account_key);
        Ok(())
    }
}

#[event]
pub struct SyndicateCreated {
    pub syndicate: Pubkey,
    pub deal: Pubkey,
    pub startup: Pubkey,
    pub equity_mint: Pubkey,
}

#[event]
pub struct EquityMinted {
    pub syndicate: Pubkey,
    pub member: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EquityTransferred {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct SettlementComplete {
    pub equity_account: Pubkey,
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

#[derive(Accounts)]
#[instruction(deal: Pubkey)]
pub struct CreateSyndicate<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    #[account(
        init,
        payer = startup,
        space = 8 + Syndicate::LEN,
        seeds = [SYNDICATE_SEED, deal.as_ref()],
        bump
    )]
    pub syndicate: Box<Account<'info, Syndicate>>,
    #[account(
        init,
        payer = startup,
        mint::decimals = EQUITY_DECIMALS,
        mint::authority = syndicate,
    )]
    pub equity_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintEquity<'info> {
    #[account(mut)]
    pub startup: Signer<'info>,
    /// CHECK: Recipient identity; equity is minted to their associated token account.
    pub member: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = startup,
        seeds = [SYNDICATE_SEED, syndicate.deal.as_ref()],
        bump = syndicate.bump
    )]
    pub syndicate: Account<'info, Syndicate>,
    #[account(mut, address = syndicate.equity_mint)]
    pub equity_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = startup,
        associated_token::mint = equity_mint,
        associated_token::authority = member
    )]
    pub member_equity_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelegateEquityAccount<'info> {
    #[account(mut)]
    pub member: Signer<'info>,
    #[account(address = syndicate.equity_mint)]
    pub equity_mint: Account<'info, Mint>,
    #[account(seeds = [SYNDICATE_SEED, syndicate.deal.as_ref()], bump = syndicate.bump)]
    pub syndicate: Account<'info, Syndicate>,
    #[account(
        mut,
        constraint = member_equity_ephemeral_ata.key() == ephemeral_ata_pda(&member.key(), &equity_mint.key()) @ ErrorCode::InvalidEphemeralAta
    )]
    /// CHECK: Member's e-token balance account for the equity mint.
    pub member_equity_ephemeral_ata: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = member_equity_eata_buffer.key() == eata_buffer_address(&member_equity_ephemeral_ata.key()) @ ErrorCode::InvalidEphemeralAta
    )]
    /// CHECK: Delegation buffer PDA for the member equity eATA.
    pub member_equity_eata_buffer: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = member_equity_eata_record.key() == record_pda(&member_equity_ephemeral_ata.key()) @ ErrorCode::InvalidEphemeralAta
    )]
    /// CHECK: Delegation record PDA for the member equity eATA.
    pub member_equity_eata_record: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = member_equity_eata_metadata.key() == metadata_pda(&member_equity_ephemeral_ata.key()) @ ErrorCode::InvalidEphemeralAta
    )]
    /// CHECK: Delegation metadata PDA for the member equity eATA.
    pub member_equity_eata_metadata: UncheckedAccount<'info>,
    #[account(address = EPHEMERAL_SPL_TOKEN_PROGRAM_ID)]
    /// CHECK: Fixed Ephemeral SPL Token program id.
    pub ephemeral_token_program: UncheckedAccount<'info>,
    #[account(address = DELEGATION_PROGRAM_ID)]
    /// CHECK: Fixed delegation program id.
    pub delegation_program: UncheckedAccount<'info>,
    /// CHECK: Optional ER validator account used by the e-token delegation CPI.
    pub validator: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferEquity<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = from.owner == payer.key() @ ErrorCode::InvalidTokenOwner,
        constraint = from.mint == to.mint @ ErrorCode::MintMismatch
    )]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateEquityAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub equity_account: Account<'info, TokenAccount>,
    /// CHECK: MagicBlock magic context account.
    #[account(mut)]
    pub magic_context: UncheckedAccount<'info>,
    #[account(address = MAGIC_PROGRAM_ID)]
    /// CHECK: Fixed Magic Program id.
    pub magic_program: UncheckedAccount<'info>,
}
