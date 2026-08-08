# spl-token-manager (AVS Equity Tokens)

Creates the equity SPL mint for a revealed deal, mints allocations to
syndicate members, and lets members transfer equity to each other gaslessly
on the ER before settling back to L1.

## Why a separate program

`sealed-auction` computes each bidder's `equity_allocated` at settlement
time (see that program's `settle_bid` and its README's [Scope](../sealed-auction/README.md#scope)
section) but doesn't mint anything — minting is this program's job,
matching the task breakdown in `docs/AVS_100_TASKS.md` (tasks 036-040 are a
separate phase from 016-025). In production, an off-chain indexer watches
`sealed-auction`'s `BidSettled` events and calls `mint_equity` here for each
one; there's no CPI or shared account between the two programs in this MVP.

## Flow

1. `create_syndicate(deal)` — startup creates a fresh equity mint
   (6 decimals) once their deal has revealed. `deal` is only used to derive
   this program's own `Syndicate` PDA — informational, not CPI-verified.
2. `mint_equity(amount)` — startup mints equity to a member's associated
   token account. **Trust boundary**: this program does not verify `amount`
   against sealed-auction's on-chain bid record — it trusts the caller
   (startup) to mint the correct amount. Closing that gap needs either a CPI
   read of the `Bid` account or a shared oracle; out of scope for the MVP.
3. `delegate_equity_account()` — a member delegates their own equity ATA to
   the ER (same `init_ephemeral_ata` + `delegate_ephemeral_ata` dance
   `sealed-auction` uses for its funding-token escrow — copied verbatim,
   it's generic).
4. `transfer_equity(amount)` — plain SPL transfer. Identical code path
   whether the accounts are still on L1 or delegated to the ER; sending the
   transaction to the ER RPC against delegated accounts is what makes it
   gasless, not anything in this instruction (mirrors the upstream
   `spl-tokens` example, which has no ephemeral-specific logic at all).
5. `undelegate_equity_account()` — commits a member's ER equity balance back
   to L1.

## Build

```bash
cd programs/spl-token-manager
cargo build-sbf
cd ../..
anchor idl build -p spl_token_manager -o target/idl/spl_token_manager.json -t target/types/spl_token_manager.ts
```

(`anchor idl build` with no args fails with "Not in a program directory" in this
multi-program workspace — always pass `-p <program_name>`. See `make idl`.)
