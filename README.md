# 🔐 Anonymous Venture Syndicate (AVS)

Private, sealed-bid venture syndicates on Solana — powered by [MagicBlock](https://magicblock.gg) Ephemeral Rollups.

Built for **Solana Blitz V7 Hackathon** (Collaboration Track).

## What is AVS?

AVS lets startups post investment deals and angel investors place **sealed (encrypted) bids** with zero visibility into competitors' amounts. At the deadline, all bids reveal simultaneously, equity is distributed proportionally, and syndicate members can privately vote on milestones — all gasless, in ~10ms, via MagicBlock's Ephemeral Rollup.

## Core flow

1. **Post a deal** — startup publishes encrypted terms (valuation, equity %, vesting).
2. **Sealed bidding** — angels bid via Session Keys (no wallet popups); bids stay encrypted in the ER.
3. **Simultaneous reveal** — bids decrypt at deadline; equity distributed proportionally as SPL tokens.
4. **Private milestone voting** — syndicate members vote YES/NO (encrypted); rewards distributed via VRF.
5. **Syndicate chat & treasury** — encrypted group coordination, gasless transfers.

## Monorepo layout

```
/programs   Anchor smart contracts (sealed-auction, binary-prediction, spl-token-manager)
/frontend   Next.js + TypeScript app
/tests      Integration & e2e tests
/docs       Specs: AVS_PROJECT_MASTER.md, AVS_100_TASKS.md
/scripts    Deployment & seed scripts
/vendor     Reference clone of magicblock-engine-examples (gitignored)
```

## Stack

- **Contracts**: Anchor + Rust, `spl-token`, `orao-solana-vrf`, `gpl-session-keys`
- **Frontend**: Next.js 14, React 18, `@solana/web3.js`, `@solana/wallet-adapter-react`, Tailwind, Recharts, Framer Motion
- **Execution**: MagicBlock Ephemeral Rollup (10ms blocks, gasless), Query Filtering Service for privacy

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
- [`docs/AVS_PROJECT_MASTER.md`](docs/AVS_PROJECT_MASTER.md) — original architecture, requirements, demo script
- [`docs/AVS_100_TASKS.md`](docs/AVS_100_TASKS.md) — full 100-task build roadmap
- [`docs/WINDOWS_NOTES.md`](docs/WINDOWS_NOTES.md) — native-Windows toolchain issues and workarounds
- [`docs/SESSION_KEYS.md`](docs/SESSION_KEYS.md) — session key design and security tradeoffs
- [`docs/RELAY.md`](docs/RELAY.md) — gasless bidding/voting relay backend
- [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) — open bugs, with repro steps

## Status

🔄 In development — see `docs/AVS_100_TASKS.md` for progress.

## License

MIT — see [LICENSE](LICENSE).
