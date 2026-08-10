# Known issues

## Phantom throws a bare "Unexpected error" on `sendTransaction` with no detail

**Status:** Open, not root-caused for the specific report that triggered this
— but the investigation ruled out the two most likely causes and found a
real, distinct bug in how the app surfaces this class of error, which is
now fixed.

**Symptom:** clicking a wallet-signed action (reported first for deal
creation) throws `WalletSendTransactionError: Unexpected error` with zero
underlying detail — no program logs, no error code, nothing to unwrap.
Reproducible every time for the affected user, across multiple attempts.

**Ruled out via live Devnet reproduction** (not simulation — actual
`sendRawTransaction` + `confirmTransaction` against
`https://api.devnet.solana.com`, using the exact parameters from the bug
report and a funded local keypair):

1. **Insufficient SOL** — the combined `initialize_deal` + `delegate_deal`
   transaction succeeded end-to-end (both that and the follow-up
   `init_deal_permission` signature), costing ~0.013 SOL total. The
   reporting user's wallet had 4.92 SOL — far more than enough. This also
   calibrated `lib/solBalance.ts`'s `LOW_BALANCE_THRESHOLD_SOL` (0.05 SOL,
   ~4x the real cost) for the low-balance warning added this session.
2. **Transaction size** — measured the serialized combined transaction at
   785 bytes, and 837 bytes with two `ComputeBudgetProgram` instructions
   prepended (matching what Phantom auto-injects for priority fees) —
   comfortably under Solana's 1232-byte legacy transaction limit.

**What "Unexpected error" actually is:** grepped every `@solana/wallet-
adapter-*` and `@solana/wallet-standard-*` package in `node_modules` for
the literal string — zero hits. It is not a message our dependencies ever
construct; it's Phantom's own extension code, external to this repo, with
no way to inspect why it decided to fail.

**A real, related bug found along the way:** the wallet-standard adapter
(`node_modules/@solana/wallet-standard-wallet-adapter-*/adapter.js`,
`sendTransaction`) derives a "chain" from `connection.rpcEndpoint` via
`getChainForEndpoint()` (`@solana/wallet-standard-util`) — a regex match
for the literal word "devnet"/"mainnet"/"testnet"/"localhost" in the URL,
defaulting to **mainnet** if none match — and throws a `WalletSend
TransactionError` (with no message at all, i.e. `.message === ""`) before
ever asking the wallet to sign, if the connected account's `chains` don't
include that derived chain. This is a *different* code path than the
"reverted during simulation" network-mismatch case already documented in
`lib/errorHints.ts`'s comment (the MetaMask incident), but the same root
category: **this app talking devnet while the wallet's active network is
mainnet**. Confirmed both of this app's actual connection endpoints
(`api.devnet.solana.com`, `devnet-tee.magicblock.app`) match the regex
correctly, so this specific throw site isn't proven to be the reporting
user's cause — but the failure mode (Phantom's own confirm dialog would
show "Mainnet" instead of "Devnet") is real and worth checking directly
in the wallet UI.

**Fixed:** `isLikelyNetworkMismatch()` (`lib/errorHints.ts`) now also
matches the exact string `"Unexpected error"` — so even without knowing
the precise cause, the app now shows the "check your wallet's network"
hint whenever this happens, instead of a bare, unexplained message.

**Next steps if picked back up:** ask the reporting user (or reproduce
directly) whether Phantom's own confirmation popup — which shows the
target network at the top before signing — says "Devnet" or something
else. If it's genuinely Devnet on both sides, this becomes a Phantom-side
bug report rather than something fixable in this codebase.

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

## Frontend was reading Deal/Bid/Milestone accounts from the wrong place (fixed)

**Status:** Fixed in `useDeals`/`usePublicStats`/`useDeal`/`useBids`/
`useMilestones`/`usePortfolio` — documenting the gotcha so it isn't
reintroduced.

Every one of these hooks queried only the wallet-adapter's plain L1
`connection` — via `program.account.X.all()` (a `getProgramAccounts` call
filtered server-side by owner = program ID) or `.fetch()`/`.fetchNullable()`
(a raw read by pubkey). Both silently miss the account's *actual* current
state, for two different reasons:

- **Deal and Milestone**: `delegate_deal`/`delegate_milestone` reassign the
  account's L1 owner to the delegation program the instant it's created (see
  `initialize_deal`/`delegate_deal` above) — L1 keeps a frozen snapshot of
  the account as of that moment, forever, until `undelegate_deal` succeeds
  (currently broken, see above). `getProgramAccounts` filters by owner, so it
  never finds these at all; `.fetch()` by raw pubkey *does* return something,
  but it's the stale pre-delegation snapshot — `status: Open`, `bidCount: 0`,
  `totalRaised: 0`, forever, no matter how many real bids/reveals/settles
  happened on the ER.
- **Bid**: never touches L1 at all — `place_bid` creates the account
  directly on the ER. An L1-only query for Bid accounts is not stale, it's
  just permanently empty.

It's tempting to fix this by pointing reads at one of MagicBlock's plain
regional hosted ER RPCs (`devnet-us/eu/as.magicblock.app`) instead of L1 —
that was the *first* fix attempted here, and it looked like it worked
(deals appeared!) but was actually still wrong: every deal in this app
delegates specifically to the TEE validator (`ER_VALIDATOR` in
`lib/ephemeralRollup.ts`, not any of the three regional ones), and the
regional RPCs silently fall back to L1's frozen snapshot for any account
they don't actually host — so it "worked" only for deals nobody had bid on
yet, and would have failed the same way in production for a real deal with
real activity.

**Fix:** `getAnonymousTeeConnection()` (`lib/ephemeralRollup.ts`) —
authenticates with `devnet-tee.magicblock.app` using a throwaway keypair
generated fresh in the browser purely to complete the auth handshake (no
wallet needed; Deal/Bid/Milestone *account existence and terms* aren't
identity-gated, only sealed bid amounts pre-reveal are). Every affected hook
now either queries this exclusively (Bid, since it never has an L1 copy) or
merges it with the L1 result by pubkey, preferring the ER's copy on overlap
(Deal, Milestone — since a genuinely-undelegated one, once that's fixed,
would only exist on L1 again).

**Not affected:** `useSyndicate` (spl-token-manager's `Syndicate` PDA is
never delegated to the ER — only a member's *equity token account* is, via
the separate `delegate_equity_account`, which has its own bug above) and
`useSessionKey` (reads local storage, not an on-chain listing).
