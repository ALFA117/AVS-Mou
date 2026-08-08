# Known issues

## `delegate_equity_account` never deposits the member's existing balance

**Status:** Open, reproducible, root cause confirmed — this one has a clear fix.

`delegate_equity_account` (spl-token-manager) calls `init_ephemeral_ata` +
`delegate_ephemeral_ata` to set up a member's ephemeral shadow token account,
mirroring exactly the low-level setup `initialize_deal` uses for the deal's
own (starts-at-zero) funding escrow. That's fine for an account that starts
empty. But a member's equity account is *not* empty by the time they
delegate it — `mint_equity` already put real tokens in their L1 ATA — and
`delegate_equity_account` never moves that balance into the ephemeral
vault. The ephemeral-rollups-sdk exposes `depositSplTokensIx`/
`transferToVaultIx` (see `lib/instructions/ephemeral-spl-token-program/
ephemeralAta.d.ts`) for exactly this; `delegate_equity_account` doesn't call
either.

**Symptom:** a `transfer_equity` sent to the ER against a freshly-delegated
account that had a real L1 balance fails with `Custom(1)`
(`InsufficientFunds` — the SPL Token program's own error), because the
ephemeral side genuinely has a zero balance even though L1 shows the real
one.

**Fix:** add a deposit step (or switch to the SDK's higher-level
`delegateSpl()` JS helper's equivalent Rust/CPI pattern, which handles
deposit+delegate together — see how `tests/sealed-auction.ts`'s live suite
uses `delegateSpl()` client-side for bidder funding accounts) to
`delegate_equity_account` before or as part of the delegate CPI.

**Real-world impact:** a syndicate member can be minted equity and see it on
L1, but cannot yet do a gasless ER-side transfer of that equity to another
member until this is fixed — `transfer_equity` still works fine as a normal
L1 transaction in the meantime (it's a plain SPL transfer regardless of
which RPC it's sent to, per its own account list).

## `undelegate_equity_account` fails with `InvalidAccountOwner`

**Status:** Open, root cause identified, distinct from the `ExternalAccountDataModified`
issue above despite using the same `commit_and_undelegate` builder.

`UndelegateEquityAccount.equity_account` is typed `Account<'info, TokenAccount>`
— the member's *real* SPL Token account, owned by the Token program, not by
`spl_token_manager`. `commit_and_undelegate` is meant for accounts your own
program can commit/re-own (like `Deal`/`Milestone`, owned by their
respective programs). Passing a Token-program-owned account into it fails
outright with `InvalidAccountOwner` rather than the subtler
`ExternalAccountDataModified` the Deal/Milestone case hits. This instruction
likely needs to go through the ephemeral-SPL-token program's own dedicated
undelegate/withdraw path (`withdrawSplIx`/`undelegateIx` in
ephemeral-rollups-sdk) instead of the generic PDA-delegation builder.

## `undelegate_deal` / `undelegate_milestone` fail with `ExternalAccountDataModified`

**Status:** Open, reproducible, root cause not confirmed. Everything else in the
bidding/voting lifecycle is proven working live on Devnet (see below) — this
is specifically the final "commit state back to L1 and hand delegation back"
step.

### What's proven working (live Devnet + MagicBlock's hosted TEE Ephemeral
Rollup, `https://devnet-tee.magicblock.app`)

Verified end-to-end against real infrastructure, not simulated:

1. `initialize_deal` on L1 (mint, deal PDA, deal funding ATA + its ephemeral
   shadow ATA delegated via the Ephemeral SPL Token program)
2. `delegate_deal` on L1 (delegates the `Deal` PDA to validator
   `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`)
3. TEE auth handshake (`getAuthToken` + `verifyTeeRpcIntegrity` against the
   TEE RPC, per-identity — startup and bidder each get their own token)
4. Delegating a bidder's own SPL funding-token account to the ER via
   `delegateSpl()` (required before that bidder can place a bid — this was
   previously undocumented and unimplemented in the frontend; see
   `docs/RELAY.md` follow-up)
5. `init_deal_permission` on the ER
6. `place_bid` on the ER — sealed bid placement with a real investor keypair
   signing, a real sponsor paying rent, real SPL transfer of the bid amount
7. `init_bid_permission` on the ER
8. `reveal_deal` on the ER after the deadline passes — correctly sums
   `total_raised` from the sealed bid account
9. `settle_bid` on the ER — computes proportional equity, transfers the bid
   amount to the startup's funding account, closes the bid + its permission

All nine steps ran successfully multiple times against live Devnet. This is
the privacy-critical core of the product and it works as designed.

### What's broken

Step 10, `undelegate_deal`, fails on-chain with:

```
InstructionError: [0, "ExternalAccountDataModified"]
```

`ExternalAccountDataModified` is a native Solana runtime error (see
`solana-labs/solana` PR #25899, "Early verification of account
modifications in `BorrowedAccount`") — a program tried to keep a data
change on an account it doesn't own at that point in execution. It is not
a custom error from our program or from MagicBlock's delegation program
(cross-checked against both IDLs — neither defines code 6006 or anything
matching this string).

### Diagnostics already run (in order)

1. **Reordering the mutation** — moved `ctx.accounts.deal.status =
   DealStatus::Settled` to *before* the `commit_and_undelegate(...)` CPI
   instead of after (the theoretically "correct" order, since Anchor
   auto-serializes `Account<T>` on drop and the account's ownership is
   transiently in flux during the CPI). Rebuilt, redeployed, retested:
   **same error, unchanged.**
2. **Removing the deal-mutation from `undelegate_deal` entirely** (temporary
   diagnostic build — the instruction did nothing but call
   `commit_and_undelegate`). **Same error, unchanged.** This rules out our
   own instruction's write as the cause.
3. **Skipping `settle_bid` entirely** — created a deal, delegated it,
   initialized permission, revealed with zero bids (bypasses `settle_bid`
   and its `close_bid_permission`/`close_ephemeral_bid` CPIs entirely), then
   called `undelegate_deal` immediately. **Same error, unchanged.** This
   rules out residual state from settling/closing a bid as the cause.
4. **Bare delegate → undelegate, zero ER writes at all** (skipped
   `init_deal_permission` and `reveal_deal` too, with `undelegate_deal`'s
   `require!` guards temporarily disabled to allow calling it on a fresh
   `Open` deal). This did **not** reproduce `ExternalAccountDataModified` —
   it hit a *different* failure (`Custom(6006)`, which does not match any
   error code in our own IDL or the delegation-program's IDL, so it's likely
   the Magic program's own internal precondition being unmet on a deal
   that's never been touched on the ER at all).

Taken together: the bug requires *some* prior ER-side interaction with the
account (permission init and/or reveal) to reproduce, but is not caused by
`settle_bid`/bid-closing specifically, and is not caused by our own
instruction's account mutation or its ordering relative to the CPI.

### Next steps if picked back up

- Ask in MagicBlock's Discord (their own quickstart docs point there for
  Private ER Permissions support) with this exact repro — a maintainer with
  visibility into the TEE validator's internals can likely point at the
  real cause in minutes where blind experimentation could not.
- Try isolating whether `init_deal_permission` alone (without `reveal_deal`)
  is sufficient to reproduce it, to narrow further which specific prior
  write is the trigger.
- Try splitting `commit` and `undelegate` into two separate instructions/
  transactions instead of the combined `commit_and_undelegate` builder, if
  the SDK exposes that split (the convenience builder only exposes the
  combined call; a lower-level API may exist).

### Real-world impact

A deal/milestone can be fully bid on, sealed, revealed, and settled — every
investor's funds move correctly and equity is computed correctly. The only
thing that doesn't currently work is the final administrative step of
handing the account back from the Ephemeral Rollup to plain L1 (freeing it
from delegation). The deal's `DealStatus` reaching `Settled` and the
`SettlementComplete`/`DealSettled` event are downstream of this, so the
frontend's dashboard would show a deal as stuck in `Revealed` rather than
`Settled` until this is fixed.
