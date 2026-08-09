# API Reference

Two layers: the on-chain program instructions (called via Anchor from the
frontend/tests) and the relay's HTTP API (called by the frontend browser
code, which has no direct TEE auth of its own). See
[`ARCHITECTURE.md`](ARCHITECTURE.md) for account layouts and the overall
data flow, [`RELAY.md`](RELAY.md) for why the relay exists at all.

## On-chain programs

### `sealed-auction` (`programs/sealed-auction`)

| Instruction | Args | Runs on | Notes |
|---|---|---|---|
| `initialize_deal` | `deal_id: u64, valuation: u64, equity_bps: u16, min_investment: u64, max_cap: u64, deadline_ts: i64, cliff_months: u16, vesting_months: u16, sponsor_lamports: u64` | L1 | Creates the `Deal` PDA, funds its rent + the ephemeral permission's future rent, sets up the deal's ephemeral shadow funding ATA (`init_ephemeral_ata` + `delegate_ephemeral_ata`) |
| `delegate_deal` | `deal_id: u64` | L1 | Delegates the `Deal` PDA itself to the ER validator |
| `init_deal_permission` | `deal_id: u64` | ER | Creates the deal's `EphemeralPermission` account (idempotent — no-ops if it already exists) |
| `place_bid` | `deal_id: u64, investor: Pubkey, amount: u64` | ER only | Sealed bid; `investor` is the real wallet, `bidder` (the tx signer) is either `investor` directly or a valid session signer — see [`SESSION_KEYS.md`](SESSION_KEYS.md). Requires `amount >= min_investment`, deal `Open`, before `deadline_ts` |
| `init_bid_permission` | `deal_id: u64` | ER | Creates the per-bid `EphemeralPermission` naming only the bidder + startup as readers |
| `reveal_deal` | `deal_id: u64` | ER, after `deadline_ts` | Sums `total_raised` across all sealed bids; makes the tally public |
| `settle_bid` | — | ER | Computes proportional equity for one bid, transfers the bid amount to the startup's funding account, closes the bid + its permission |
| `undelegate_deal` | `deal_id: u64` | ER → L1 | Commits state back to L1 and hands delegation back. **Currently broken** — see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) |

### `private-voting` (`programs/private-voting`)

| Instruction | Args | Runs on | Notes |
|---|---|---|---|
| `initialize_milestone` | `milestone_id: u64, deal: Pubkey, description_hash: [u8; 32], deadline_ts: i64, reward_pool: u64, sponsor_lamports: u64` | L1 | Creates the `Milestone` PDA; `description_hash` is a hash of off-chain milestone text, not stored on-chain in full |
| `delegate_milestone` | `milestone_id: u64` | L1 | Delegates the `Milestone` PDA to the ER validator |
| `init_milestone_permission` | `milestone_id: u64` | ER | Idempotent, same shape as `init_deal_permission` |
| `cast_vote` | `milestone_id: u64, member: Pubkey, choice: Choice` | ER only | Sealed YES/NO vote; same signer rules as `place_bid` (`member` = real wallet, `voter` = signer, session-key-eligible). Nothing about `choice` is logged or emitted — stays invisible until `reveal_milestone` |
| `init_vote_permission` | `milestone_id: u64` | ER | Per-vote `EphemeralPermission`, readers = voter + startup |
| `reveal_milestone` | `milestone_id: u64` | ER, after `deadline_ts` | Tallies `yes_count`/`no_count` across sealed votes |
| `request_milestone_randomness` | — | ER | Requests a VRF value via `ephemeral-rollups-sdk`'s `#[vrf]` macro, to fix settlement payout order unpredictably |
| `milestone_randomness_callback` | — | ER | VRF callback (`#[vrf_callback]`) — writes `randomness`/`randomness_fulfilled` on the `Milestone` |
| `settle_vote` | — | ER | Finalizes outcome, pays out reward pool |
| `undelegate_milestone` | — | ER → L1 | Same `commit_and_undelegate` bug class as `undelegate_deal` — see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) |

### `spl-token-manager` (`programs/spl-token-manager`)

| Instruction | Args | Runs on | Notes |
|---|---|---|---|
| `create_syndicate` | `deal: Pubkey` | L1 | Creates a `Syndicate` PDA + its equity mint for a given deal |
| `mint_equity` | `amount: u64` | L1 | Mints proportional equity tokens to a member's L1 ATA |
| `delegate_equity_account` | — | L1 | Delegates a member's equity ATA to the ER. **Doesn't move existing balance** — see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) before relying on this for an account that already holds tokens |
| `transfer_equity` | `amount: u64` | ER or L1 | Gasless SPL transfer between syndicate members on the ER; falls back to working as a plain L1 transfer if the account was never delegated |
| `undelegate_equity_account` | — | ER → L1 | **Broken** — passes a Token-program-owned account into the generic `commit_and_undelegate` builder, which only accepts program-owned PDAs. See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) |

All three programs' error codes are in their respective `src/error.rs`.
`ErrorCode::InvalidSession` (sealed-auction, private-voting) is the one
you'll hit most often during frontend development — it fires whenever
`place_bid`/`cast_vote` gets a signer that's neither the named
investor/member nor holds a valid session token for them.

## Relay HTTP API (`frontend/app/api/relay/*`)

The relay is a Next.js server that pays rent/fees for `place_bid`/
`cast_vote` on the ER so investors never need their own SOL. See
[`RELAY.md`](RELAY.md) for the full design rationale and threat model.

### `GET /api/relay/blockhash`

Returns a blockhash valid on the ER (the browser has no TEE auth of its
own to fetch one directly). Marked `export const dynamic = "force-dynamic"`
— without that, Next.js caches the handler and every later transaction
fails with "Blockhash not found."

```json
// 200
{ "blockhash": "..." }
```

### `GET /api/relay/sponsor`

Returns the relay sponsor's public key, so the frontend can build a
transaction with the correct fee payer before sending it here for signing.

```json
// 200
{ "pubkey": "..." }
```

### `POST /api/relay/submit`

Body: `{ "transaction": "<base64-encoded serialized Transaction>" }`

The transaction must already:
- have `place_bid` or `cast_vote` as its only instruction(s) (max 2 per tx)
- set the relay sponsor as fee payer
- target only `sealed-auction` or `private-voting` program IDs
- be signed by the real signer (investor/member or their session key) —
  the relay only adds the sponsor's signature

Server-side, in order: validates fee payer and instruction allowlist
(`assertFeePayerIsSponsor`, `assertRelayableTransaction` in
`frontend/lib/relayServer.ts`), signs with the sponsor keypair, submits via
a TEE-authenticated ER connection, confirms server-side (the client can't
confirm against the ER itself), returns the signature.

```json
// 200
{ "signature": "..." }

// 400 — failed validation or on-chain error
{ "error": "..." }
```

`RelayRejectedError` (400) vs. an unexpected server error (500) are
distinguished in the response status — see `assertRelayableTransaction`/
`assertFeePayerIsSponsor` in `frontend/lib/relayServer.ts` for the exact
checks. This allowlist is defense-in-depth on top of what the on-chain
programs already enforce, not a substitute for it.
