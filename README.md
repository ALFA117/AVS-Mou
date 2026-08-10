# 🔐 Anonymous Venture Syndicate (AVS)

Private, sealed-bid venture syndicates on Solana — powered by [MagicBlock](https://magicblock.gg) Ephemeral Rollups.

Built for **Solana Blitz V7 Hackathon** (Collaboration Track).

## Quick start for judges

**Live app:** https://avs-mou.vercel.app — Solana **Devnet** (no real funds, no mainnet).

1. **Connect a wallet set to Devnet, not Mainnet.** Phantom is what this
   app was built and tested against — its network switch is direct and
   reliable. (MetaMask does have Solana support, but its network selector
   is inconsistent across versions and is not what this app was validated
   against.) In Phantom: **Settings → Developer Settings → Testnet Mode**,
   then pick **Solana Devnet** from the network selector at the top.
2. **Get test SOL** for transaction fees: https://faucet.solana.com — paste
   your Devnet address.
3. **Browse `/deals`.** Every deal, bid, and equity split shown is real
   on-chain state, read live from Devnet — nothing is mocked. A deal
   showing **"Awaiting reveal"** simply means its bidding deadline passed
   but nobody has called `reveal_deal` yet; that's expected, not broken.
4. **Bid on a deal with status `open`** and time left on its countdown.
   Each deal uses its own dedicated SPL "funding" mint — use the in-app
   faucet button next to the amount field to mint yourself test tokens for
   that specific deal, then place a bid. The amount stays sealed — even
   you can't see it again — until the deadline's simultaneous reveal.
5. **Vote on a milestone** at `/vote` — same sealed-until-reveal pattern,
   one wallet signature, no gas.
6. **`/analytics`** has platform-wide stats; **`/status`** has on-chain
   health plus block-explorer links for every deployed program.

Nothing open with time left? Create your own deal at `/deals/new` — the
whole create-and-delegate-to-the-Ephemeral-Rollup flow takes **3 wallet
signatures**, no more.

## What is AVS?

AVS lets startups post investment deals and angel investors place **sealed
bids** with zero visibility into competitors' amounts — not other bidders,
not even the startup. At the deadline, all bids reveal simultaneously,
equity is distributed proportionally, and syndicate members can privately
vote on milestones — all gasless, via MagicBlock's Ephemeral Rollup.

"Sealed" here means **access-controlled, not encrypted**: bid and vote
amounts are never ciphertext. They live on a MagicBlock Private Ephemeral
Rollup behind a Permission account that names only the bidder and the
startup as readers, until an on-chain reveal instruction runs after the
deadline and makes the tally public. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for exactly how that works.

## Why MagicBlock

None of this works as a plain Solana program. Every account on L1 is
readable by anyone — an Anchor program can restrict who can *write* to an
account, but it can't stop an RPC node from serving `getAccountInfo` on a
sealed bid to a competitor who just wants to peek before the deadline. The
only L1-native way to actually hide a value is real client-side encryption,
which then has its own key-management and reveal-verification problems and
still leaks bid *timing* and *frequency* on a public ledger.

MagicBlock's **Ephemeral Rollup Permissions** solve the actual problem:
a `Bid`/`Vote` account gets delegated from L1 to a dedicated Ephemeral
Rollup, where a **Permission** account names exactly which identities
(the bidder, the startup) are allowed to read it — enforced by the
validator itself, not by the account's data being unreadable. Nobody else,
including the app's own frontend for other users, can fetch that account's
contents before `reveal_deal`/`reveal_milestone` runs and the tally
becomes public on L1. That's what "sealed" means here: access control at
the infrastructure layer, not ciphertext.

The same ER also makes the product **gasless**: `place_bid` and `cast_vote`
run against the rollup's own low-latency state, sponsored by a relay that
only ever co-signs those two instructions (see
[`docs/RELAY.md`](docs/RELAY.md)) — so an investor authorizes a session key
once and then bids or votes with zero wallet popups and zero SOL in their
wallet. Building the reveal-at-once sealed auction *and* the gasless UX on
L1 alone would each need its own bespoke, harder-to-trust workaround; the
ER gives both for free from one piece of infrastructure.

## Core flow

1. **Post a deal** — startup publishes terms (valuation, equity %, vesting).
2. **Sealed bidding** — angels bid via session keys (no wallet popup per
   bid); amounts are hidden by access control on the Ephemeral Rollup, not
   client-side encryption.
3. **Simultaneous reveal** — every bid becomes visible at once after the
   deadline; equity distributed proportionally as SPL tokens.
4. **Private milestone voting** — syndicate members vote YES/NO (sealed the
   same way); rewards gated on a verifiable random function so payout order
   can't be front-run.
5. **Syndicate chat & equity transfers** — a local per-browser chat (not
   yet on-chain — see `frontend/lib/chatStore.ts`), gasless SPL transfers
   for equity.

## Monorepo layout

```
/programs   Anchor smart contracts (sealed-auction, private-voting, spl-token-manager)
/frontend   Next.js + TypeScript app
/tests      Integration & e2e tests (structural + live-Devnet, see docs/ARCHITECTURE.md)
/docs       Architecture, setup, and design docs — see the Docs section below
/scripts    Deployment & seed scripts
/vendor     Reference clone of magicblock-engine-examples (gitignored)
```

## Stack

- **Contracts**: Anchor + Rust, `spl-token`, `ephemeral-rollups-sdk`'s own VRF (`#[vrf]`/`#[vrf_callback]` — not `orao-solana-vrf`), `session-keys`
- **Frontend**: Next.js 14, React 18, `@solana/web3.js`, `@solana/wallet-adapter-react`, Tailwind, Recharts, Framer Motion
- **Execution**: MagicBlock Private Ephemeral Rollup Permissions — gasless, access-controlled reads (see `docs/ARCHITECTURE.md`; no Query Filtering Service — that's only for the local `mb-stack` simulation layer, not the hosted devnet ER this project targets)

## Getting started

> Developed on native Windows. `solana-test-validator` and `anchor build`
> both have unfixed native-Windows bugs — see
> [`docs/WINDOWS_NOTES.md`](docs/WINDOWS_NOTES.md) for the root causes and
> the workarounds baked into the commands below. Short version: no local
> validator (dev/test targets Devnet instead), and contracts build via
> `cargo build-sbf` rather than `anchor build`.

```bash
make setup          # install frontend deps
make devnet-setup   # point solana CLI at devnet + airdrop a dev wallet
make build          # compile all programs (cargo build-sbf, not anchor build)
make idl             # generate IDL (anchor idl build)
make test            # anchor test against devnet
make frontend         # next dev
```

Copy `.env.local.example` → `.env.local` (and `.env.testnet.example` → `.env.testnet`) and fill in real values before running anything.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design: on-chain programs, the Ephemeral Rollup/privacy model, session keys, the relay backend, frontend layout
- [`docs/SETUP.md`](docs/SETUP.md) — step-by-step environment setup, from clone to a working local dev loop against Devnet
- [`docs/API.md`](docs/API.md) — on-chain instruction reference + the relay's HTTP API
- [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, privacy guarantees, session key and relay sponsor risk
- [`docs/FUTURE.md`](docs/FUTURE.md) — deliberately out-of-scope work, ordered by priority
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute, version-pin discipline, code style
- [`docs/AVS_PROJECT_MASTER.md`](docs/AVS_PROJECT_MASTER.md) — original architecture, requirements, demo script
- [`docs/AVS_100_TASKS.md`](docs/AVS_100_TASKS.md) — full 100-task build roadmap
- [`docs/WINDOWS_NOTES.md`](docs/WINDOWS_NOTES.md) — native-Windows toolchain issues and workarounds
- [`docs/SESSION_KEYS.md`](docs/SESSION_KEYS.md) — session key design and security tradeoffs
- [`docs/RELAY.md`](docs/RELAY.md) — gasless bidding/voting relay backend
- [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) — open bugs, with repro steps

## Status

All three programs are deployed to Devnet. The full deal lifecycle —
create a deal, place sealed bids, reveal, settle — and sealed milestone
voting both work end-to-end through the actual app (not just scripts),
verified live in `tests/*.ts`. A few known issues remain, mostly around
undelegating state back to L1 after settlement — see
[`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md). See
`docs/AVS_100_TASKS.md` for the full task-by-task progress log.

## License

MIT — see [LICENSE](LICENSE).
