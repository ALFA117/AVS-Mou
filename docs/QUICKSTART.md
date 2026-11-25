# Quick start and design notes

Moved here from the main README so it stays short. Nothing below was rewritten.

## Quick start for judges

**Live app:** https://avs-mou.vercel.app — Solana **Devnet** (no real funds, no mainnet).

1. **Connect a wallet set to Devnet, not Mainnet.** Phantom is what this
   app was built and tested against — its network switch is direct and
   reliable. (MetaMask does have Solana support, but its network selector
   is inconsistent across versions and is not what this app was validated
   against.) In Phantom: **Settings → Developer Settings → Testnet Mode**,
   then pick **Solana Devnet** from the network selector at the top.
2. **Get a little test SOL** for the one-time setup fee. The in-app faucet
   button (step 4) tops you up with 0.02 devnet SOL if you're low; for more,
   use https://faucet.solana.com and paste your Devnet address.
3. **Browse `/deals`.** Every deal, bid, and equity split shown is real
   on-chain state, read live from Devnet — nothing is mocked. A deal
   showing **"Awaiting reveal"** simply means its bidding deadline passed
   but nobody has called `reveal_deal` yet; that's expected, not broken.
   Three demo deals (and two milestones) stay open for bidding/voting into
   2027 — filter by **"Open for bids"**. When they expire, re-seed with
   `node scripts/seed-demo.cjs` (devnet only).
4. **Bid on a deal under "Open for bids"** (time left on its countdown).
   Each deal uses its own dedicated SPL "funding" mint — use the in-app
   faucet button above the amount field to mint yourself test tokens for
   that specific deal, then place a bid. The first bid per token needs one
   setup transaction from your wallet (~0.008 devnet SOL); the bid itself
   is fee-sponsored by the relay. The amount is sealed in the same
   transaction (`place_bid` + `init_bid_permission`): only you and the
   startup can read it. Reveal publishes the deal's total raised, not
   individual amounts.
5. **Vote on a milestone** at `/vote` — sealed the same way
   (`cast_vote` + `init_vote_permission`), fee paid by the relay.
6. **`/analytics`** has platform-wide stats; **`/status`** has on-chain
   health plus block-explorer links for every deployed program.

Nothing open with time left? Create your own deal at `/deals/new` — the
whole create-and-delegate-to-the-Ephemeral-Rollup flow takes **3 wallet
signatures**, no more.

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

The same ER also lets the product **sponsor fees**: `place_bid` and
`cast_vote` run against the rollup's own state, paid by a relay that only
co-signs sealed-auction / private-voting instructions (see
[`docs/RELAY.md`](docs/RELAY.md)). An investor still pays two small,
one-time costs in devnet SOL: delegating their funding-token account to the
ER (once per deal token, ~0.008 SOL) and authorizing a session key. After
that, bids and votes need no SOL, and with a session key no wallet popup.
Building the reveal-at-once sealed auction *and* the sponsored UX on L1
alone would each need its own bespoke, harder-to-trust workaround; the ER
gives both from one piece of infrastructure.

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

