# sealed-auction (AVS Deal Auction)

Forked from MagicBlock's [`sealed-auction`](../../vendor/magicblock-engine-examples/sealed-auction)
example. Handles deal creation, private sealed bidding, and reveal. Does
**not** mint equity SPL tokens itself — see [Scope](#scope) below.

## What changed vs. the upstream example

The upstream example is a **single-winner, take-all** auction: one seller
escrows a fixed "lot" token, bidders compete, the highest bidder wins the
whole lot, everyone else gets refunded.

AVS deals are **proportional, multi-winner syndicates**: every accepted bid
becomes a syndicate position sized by its share of the total raised. There
is no losing bid and therefore no refund path.

| | Upstream `sealed-auction` | AVS `sealed-auction` |
|---|---|---|
| Outcome | One winner takes the lot | Every bidder gets a proportional share |
| Seller item | Pre-existing "Token A" lot, escrowed upfront | Nothing pre-escrowed — a deal sells `equity_bps` of the company |
| Losing bids | Refunded (`claim_refund`) | Don't exist — every accepted bid settles |
| Reveal | Finds the single highest bid | Sums every bid into `total_raised` |
| Settlement | `settle_winning_bid` (winner only) + `finalize` (L1 lot transfer) | `settle_bid` (every bidder), computes and emits `equity_allocated` |

## Privacy model

Bid *amounts* are never encrypted client-side. They're hidden by MagicBlock's
private Ephemeral Rollup Permissions (PER): `init_bid_permission` creates a
`is_private: true` permission naming only the startup and the bidder as
members, so no one else — not even other bidders — can read that account's
data on the ER. "Sealed" means access-controlled, not ciphertext. This
matches how the upstream example achieves the same property, and is provable
on-chain (the Permission Program enforces it, not application code).

## Flow

1. `initialize_deal` — startup posts terms (valuation, `equity_bps`,
   min investment, max cap, deadline, vesting) and sponsors the deal PDA's
   rent for up to `MAX_BIDDERS` sealed bid accounts.
2. `delegate_deal` — deal PDA moves to the ER.
3. `init_deal_permission` — registers the startup as the deal's admin member
   (not private — the deal's *terms* are public; only bids are sealed).
4. `place_bid` — angel submits a sealed bid; funding tokens move into the
   deal's escrow immediately, but the amount is only readable by the
   startup+bidder pair once `init_bid_permission` runs.
5. `init_bid_permission` — seals the bid (`is_private: true`).
6. `reveal_deal` — after the deadline, scans every bid PDA, sums
   `total_raised`, flags `oversubscribed` if it exceeds `max_cap`.
7. `settle_bid` — once per bidder: computes `equity_allocated` (proportional
   to `bid.amount / total_raised`), forwards their payment to the startup,
   closes the sealed bid account, and emits `BidSettled` with both the
   now-revealed amount and the equity share.
8. `undelegate_deal` — once every bid is settled, commits the deal back to
   L1 and marks it `Settled`.

A deal with zero bids settles trivially: `reveal_deal` sums zero bids,
`closed_bid_count == bid_count == 0` is already true, so `undelegate_deal`
can run immediately.

## Scope

Equity **token minting** is deliberately out of scope for this program. It
only computes and emits each bidder's `equity_allocated` amount
(`BidSettled` event) — actually minting/distributing SPL equity tokens is
the `spl-token-manager` program's job (see `AVS_100_TASKS.md` tasks 036-040),
which is expected to consume these events (or read settled bid records) to
mint the real tokens. This mirrors the task breakdown in
`docs/AVS_100_TASKS.md` and keeps each program's on-chain responsibility
narrow.

Also out of scope for the MVP (matching the upstream example's own scope
cut): enforcing `max_cap` as a hard on-chain limit (currently informational
— `oversubscribed` is just a flag), on-chain vesting-schedule enforcement
(`cliff_months`/`vesting_months` are stored but not yet enforced anywhere),
and a permissionless/crank-based `reveal_deal` (currently startup-only,
matching the upstream `end_auction`'s auctioneer-only pattern).

## Build

`anchor build` panics on native Windows — see `docs/WINDOWS_NOTES.md`. Use:

```bash
cd programs/sealed-auction
cargo build-sbf
cd ../..
anchor idl build -p sealed_auction -o target/idl/sealed_auction.json -t target/types/sealed_auction.ts
```

(`anchor idl build` with no args fails with "Not in a program directory" in this
multi-program workspace — always pass `-p <program_name>`. See `make idl`.)
