# Setup

Step-by-step environment setup, from a clean checkout to a working local
dev loop against Devnet. For *why* things are structured this way (no local
validator, `cargo build-sbf` instead of `anchor build`, etc.) see
[`WINDOWS_NOTES.md`](WINDOWS_NOTES.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Prerequisites

- **Rust** — stable toolchain (`rustup default stable`)
- **Solana CLI 4.1.2** — `sh -c "$(curl -sSfL https://release.anza.xyz/v4.1.2/install)"`
  (must match `SOLANA_VERSION` in `.github/workflows/ci.yml` — an older
  release's bundled `cargo-build-sbf` toolchain can't compile this repo's
  dependencies; see the comment in that file for the full story)
- **Anchor CLI 1.0.2** via `avm`:
  ```bash
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  avm install 1.0.2
  avm use 1.0.2
  ```
  Must match `anchor-lang = "=1.0.2"` pinned in each `programs/*/Cargo.toml`
  — `anchor` refuses to run against a mismatched `anchor-lang` version.
- **Node.js 22** — `ts-mocha`/mocha fail to load `.ts` test files under
  Node 18 (`ERR_UNKNOWN_FILE_EXTENSION`).
- A funded Devnet wallet at `~/.config/solana/id.json` (see below).

## 1. Clone and install

```bash
git clone https://github.com/ALFA117/AVS-Mou.git
cd AVS-Mou
make setup   # cd frontend && npm install
npm install  # root deps, for tests/*.ts
```

## 2. Point the Solana CLI at Devnet

```bash
make devnet-setup
```

Runs:
```bash
solana config set --url devnet
solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json --force
solana airdrop 2
```

Devnet airdrops are rate-limited per IP; if `solana airdrop 2` fails, retry
in a minute or use https://faucet.solana.com.

## 3. Environment files

Copy the two example files and fill in real values:

```bash
cp .env.local.example .env.local
cp .env.testnet.example .env.testnet
cp .env.local.example frontend/.env.local   # frontend reads its own copy
```

Key variables (see `.env.local.example` for the full list with comments):

| Variable | Purpose |
|---|---|
| `SOLANA_RPC_URL` / `NEXT_PUBLIC_SOLANA_RPC_URL` | L1 Devnet RPC |
| `MAGICBLOCK_ER_RPC_URL` / `NEXT_PUBLIC_MAGICBLOCK_ER_RPC_URL` | Hosted Devnet Ephemeral Rollup (pick US/EU/Asia — see the file) |
| `RELAY_SPONSOR_SECRET_KEY` | **Server-only.** A funded Devnet keypair (raw 64-byte JSON array from `solana-keygen`) that pays rent/fees for `place_bid`/`cast_vote`. Never prefix with `NEXT_PUBLIC_`. See [`RELAY.md`](RELAY.md). |
| `SESSION_KEY_LIFETIME_SECONDS` | Session key expiry (default 3600) |

Generate a dedicated sponsor keypair rather than reusing your personal dev
wallet:

```bash
solana-keygen new --no-bip39-passphrase --outfile /tmp/sponsor.json --force
solana airdrop 2 $(solana-keygen pubkey /tmp/sponsor.json) --url devnet
cat /tmp/sponsor.json   # paste this array as RELAY_SPONSOR_SECRET_KEY
```

## 4. Build the programs

```bash
make build   # cargo build-sbf per program — NOT `anchor build`, see WINDOWS_NOTES.md
make idl     # anchor idl build -> target/idl/*.json, target/types/*.ts
```

`target/` is gitignored, so both steps are required on every fresh clone —
the test files `require()` the generated IDL JSON directly.

## 5. Deploy (if you need your own program IDs)

The deployed program IDs already in `frontend/lib/programs.ts` point at
this repo's own Devnet deployment. To deploy your own:

```bash
make deploy-devnet
```

Then update the program ID constants in `frontend/lib/programs.ts` and each
program's `declare_id!()` to match.

## 6. Run tests

```bash
make test              # anchor test --skip-local-validator --provider.cluster devnet
npm test                # structural tests only (ts-mocha, no live network calls)
make test-devnet-e2e    # full live-Devnet suite — needs a funded wallet + RELAY_SPONSOR_SECRET_KEY
```

See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for what's proven working live vs.
what's still open.

## 7. Run the frontend

```bash
make frontend   # cd frontend && npm run dev
```

Opens on `http://localhost:3000`. Connect a Devnet-funded wallet
(Phantom/Solflare, network switched to Devnet) to interact with deals.

## Troubleshooting

- **`solana-test-validator` hangs or crashes** — expected on native Windows;
  this project doesn't use it. See [`WINDOWS_NOTES.md`](WINDOWS_NOTES.md).
- **`anchor build` panics** — same root cause; use `make build` instead.
- **"Blockhash not found" on bid/vote submission** — see the note in
  [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) and `frontend/app/api/relay/blockhash/route.ts`.
- **CI fails after a dependency bump** — check `.github/workflows/ci.yml`'s
  inline comments first; most past failures traced back to a version pin
  drifting out of sync with `Cargo.toml`/`package.json` (anchor-cli vs.
  `anchor-lang`, Solana CLI vs. Rust edition, Node vs. `.ts` loading).
