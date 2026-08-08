# private-voting (AVS Milestone Voting)

Syndicate members cast sealed YES/NO votes on a startup-proposed milestone
(e.g. "Reach $1M ARR"); votes reveal simultaneously after the deadline;
voters on the winning side split a reward pool, with a VRF request gating
when settlement can happen.

## Why this isn't a fork of `binary-prediction`

`AVS_100_TASKS.md` (task 026) says to fork
[`binary-prediction`](../../vendor/magicblock-engine-examples/binary-prediction).
That example turned out to be a Pyth-oracle up/down price-betting game
(individual player vs. a house pool) — a different mechanism from what AVS
actually needs (many syndicate members privately voting on a proposal,
revealed together). Structurally, that's the same shape as
[`sealed-auction`](../sealed-auction) (private sealed submissions from many
parties, revealed simultaneously), so this program reuses that pattern —
`Milestone`/`Vote` mirror `Deal`/`Bid` — instead. The VRF piece the task
actually cares about ("Add VRF integration for rewards") comes from
[`roll-dice`](../../vendor/magicblock-engine-examples/roll-dice)'s
request/callback pattern instead, which is the example that actually
demonstrates `orao`-family VRF usage on MagicBlock's ER.

## Privacy model

Same as `sealed-auction`: a vote's `choice` is hidden by a private Ephemeral
Rollup Permission (`init_vote_permission`, `is_private: true`, members =
[startup, voter]), not client-side encryption. Nothing about `choice` is
logged or emitted until `reveal_milestone` runs after the deadline.

## Flow

1. `initialize_milestone` — startup proposes a milestone, funds the reward
   pool (native lamports) plus PER sponsor rent for up to `MAX_VOTERS` sealed
   votes.
2. `delegate_milestone` / `init_milestone_permission` — same lifecycle as a
   sealed-auction deal.
3. `cast_vote` — sealed YES/NO vote.
4. `init_vote_permission` — seals it.
5. `reveal_milestone` — after the deadline, tallies `yes_count`/`no_count`,
   sets `outcome`.
6. `request_milestone_randomness` / `milestone_randomness_callback` — VRF
   round trip (see [Reward fairness](#reward-fairness) below).
7. `settle_vote` — once per voter, after reveal *and* randomness fulfillment:
   pays an even share of `reward_pool` to voters on the winning side, closes
   the sealed vote.
8. `undelegate_milestone` — once every vote is settled, commits back to L1.

## Scope cuts

- **One member, one vote.** Equity-weighted voting (voting power ∝ a
  bidder's `equity_allocated` from `sealed-auction`) would need a CPI back
  into that program to read a bidder's settled position, or a shared oracle
  both programs trust. Out of scope for this MVP — every syndicate member's
  vote counts equally.
- **Syndicate roster isn't cross-program-verified.** Nothing here checks
  that a `voter` actually holds a settled bid in the linked `deal`. The
  `deal` field on `Milestone` is informational. In production this needs
  either a CPI read of `sealed-auction`'s `Bid` accounts or a trusted
  indexer gate in the frontend.
- **Reward fairness**, not weighted distribution. `settle_vote` splits the
  pool evenly among winning-side voters; VRF's role is to *gate* settlement
  (nothing can be paid out until verifiable randomness has been recorded
  on-chain), not to weight individual payouts. A natural extension: use the
  fulfilled `randomness` to derive a per-voter bonus weight — this needs an
  extra full scan over winning voters (to normalize weights against their
  sum) that `reveal_milestone` doesn't currently do; documented here rather
  than half-built.

## Build

```bash
cd programs/private-voting
cargo build-sbf
cd ../..
anchor idl build -p private_voting -o target/idl/private_voting.json -t target/types/private_voting.ts
```

(`anchor idl build` with no args fails with "Not in a program directory" in this
multi-program workspace — always pass `-p <program_name>`. See `make idl`.)
