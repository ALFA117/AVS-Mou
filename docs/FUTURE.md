# Future work

What's deliberately out of scope for the hackathon build, ordered roughly
by what would matter most next. For currently-broken things that are *in*
scope and being tracked, see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) instead —
this file is about what was never attempted, not what's failing.

## Fix the undelegate path

The highest-priority item, because it's the one piece of the core lifecycle
that doesn't work: `undelegate_deal`/`undelegate_milestone`
(`ExternalAccountDataModified`) and `undelegate_equity_account`
(`InvalidAccountOwner`). See `KNOWN_ISSUES.md` for the diagnostics already
run and the two concrete next steps (ask MagicBlock's Discord with the
exact repro; try splitting `commit`/`undelegate` into separate calls if the
SDK exposes that). Until this lands, a settled deal's `DealStatus` never
reaches `Settled` on L1, so the dashboard shows it stuck at `Revealed`.

## On-chain syndicate chat

`frontend/lib/chatStore.ts` is local-only (per-browser, not synced, not
persisted server-side). A real implementation would need either:
- a lightweight on-chain message-log account per syndicate (expensive per
  byte, but trivially private via the same `EphemeralPermission` model
  everything else uses), or
- an off-chain relay with its own auth tied to syndicate membership
  (cheaper, but reintroduces a centralized trust point the rest of the
  design avoids).

## Mainnet deployment

Everything currently targets Devnet + MagicBlock's hosted Devnet Ephemeral
Rollup. Moving to mainnet needs, at minimum:
- A production-funded relay sponsor with its own top-up/rotation process
  (see `docs/SECURITY.md`'s note on sponsor keypair scope).
- Confirming MagicBlock has a mainnet Private ER endpoint available (this
  project only ever targeted their hosted Devnet TEE endpoint,
  `devnet-tee.magicblock.app`) and re-verifying the TEE auth flow against
  it.
- A real security review, given real money would be at stake — see
  `docs/SECURITY.md`'s disclaimer that this hasn't had one.

## VRF-gated settlement, exercised live

`request_milestone_randomness`/`milestone_randomness_callback`
(`ephemeral-rollups-sdk`'s `#[vrf]`/`#[vrf_callback]`) are implemented but
have never been exercised end-to-end against a live oracle queue — no
verified queue address was available during development. Before relying on
this in production, run the full request → callback round-trip live and
confirm `randomness_fulfilled` actually flips before `settle_vote` reads
it.

## Broader syndicate features

Out of scope for the hackathon build, listed here so they're not confused
with bugs:
- Multiple funding rounds per deal (currently one `Deal` = one round).
- Secondary transfers of equity to non-syndicate-member wallets (
  `transfer_equity` currently assumes both parties are already
  `Syndicate` members).
- A notification system for deal deadlines / milestone votes closing (the
  frontend currently requires the user to check back).
- Governance beyond simple YES/NO milestone votes (e.g., weighted voting
  by equity share, quorum requirements).

## Test coverage

The live-Devnet suites (`tests/*.ts`, gated behind `RUN_*_DEVNET_E2E=1`)
cover the happy path for each program end-to-end, but not:
- Concurrent bids/votes racing against `MAX_BIDDERS`/`MAX_VOTERS` caps.
- Session key expiry mid-flow (a session that expires between building and
  submitting a transaction).
- Relay allowlist rejection paths (`assertRelayableTransaction`/
  `assertFeePayerIsSponsor` in `frontend/lib/relayServer.ts`) under
  adversarial input, beyond the structural tests already in place.
