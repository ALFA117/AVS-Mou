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

```bash
make setup       # install deps + anchor build
make validator   # local Solana test validator
make er          # start Ephemeral Rollup instance
make test         # anchor test
make frontend     # next dev
```

Copy `.env.local.example` → `.env.local` (and `.env.testnet.example` → `.env.testnet`) and fill in real values before running anything.

## Docs

- [`docs/AVS_PROJECT_MASTER.md`](docs/AVS_PROJECT_MASTER.md) — architecture, requirements, demo script
- [`docs/AVS_100_TASKS.md`](docs/AVS_100_TASKS.md) — full 100-task build roadmap

## Status

🔄 In development — see `docs/AVS_100_TASKS.md` for progress.

## License

MIT — see [LICENSE](LICENSE).
