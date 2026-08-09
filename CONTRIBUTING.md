# Contributing

This started as a solo Solana Blitz V7 hackathon build, but PRs and issues
are welcome. A few things that'll make a contribution easy to review:

## Before you start

- Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) first — the
  ER/L1 split and the two separate delegation subsystems (generic
  `#[delegate]`/`commit_and_undelegate` vs. the ephemeral-SPL-token-specific
  `init_ephemeral_ata`/`delegate_ephemeral_ata`) trip people up otherwise.
- Check [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) and
  [`docs/FUTURE.md`](docs/FUTURE.md) before starting on something — it
  might already be diagnosed, or might be deliberately out of scope.
- Developed on native Windows; `solana-test-validator` and `anchor build`
  both have unfixed native-Windows bugs. See
  [`docs/WINDOWS_NOTES.md`](docs/WINDOWS_NOTES.md) — dev/test targets
  Devnet directly, programs build via `cargo build-sbf` not `anchor build`.
  Follow [`docs/SETUP.md`](docs/SETUP.md) to get a working environment
  regardless of platform.

## Version pins are load-bearing

`anchor-lang`, `SOLANA_VERSION`/`ANCHOR_VERSION`/`NODE_VERSION` in
`.github/workflows/ci.yml`, and `Cargo.lock`'s `version = 3` header are all
pinned on purpose — each one has a comment explaining what broke when it
wasn't. If you bump a version, verify the *actual* release notes/behavior
rather than assuming semver compatibility (this project has been bitten by
that assumption before — see the CI comment history). Never bump
`ANCHOR_VERSION` without checking it still matches
`anchor-lang = "=X.Y.Z"` in every `programs/*/Cargo.toml`.

## Workflow

1. Fork/branch from `main`.
2. Make your change. Keep contract changes and frontend changes in
   separate commits where practical — they run in different CI jobs.
3. Run locally before pushing:
   ```bash
   cargo fmt --check --all --manifest-path Cargo.toml
   make build && make idl
   npm test                     # structural tests, no live network needed
   cd frontend && npm run lint && npm run build
   ```
4. If your change touches `place_bid`/`cast_vote`, session keys, or the
   relay, also run the live suite against your own funded Devnet wallet:
   ```bash
   make test-devnet-e2e
   ```
   (needs `RELAY_SPONSOR_SECRET_KEY` and a funded `~/.config/solana/id.json`
   — see [`docs/SETUP.md`](docs/SETUP.md)). CI intentionally never runs
   this suite (no funded wallet in CI secrets), so it's your responsibility
   to verify it locally.
5. Open a PR against `main`. Describe *why*, not just what — this repo's
   docs (and its commit history) lean heavily on capturing root causes, not
   just symptoms; keep that habit in the PR description too.

## Commit messages

Written in imperative mood, explaining the reason for a change over its
mechanics (`git log` in this repo is a good reference — e.g. "Fix CI:
session-keys.ts read ~/.config/solana/id.json unconditionally" rather than
"update test file").

## Code style

- Rust: `cargo fmt` (root workspace manifest, `--all`), matches CI's Lint
  job exactly.
- TypeScript/frontend: `frontend/.eslintrc.json` via `npm run lint`.
- No enforced commit hooks currently — CI is the source of truth; a PR
  that fails Lint/Build Frontend/Anchor Test won't be merged.

## What not to do

- Don't add error handling or fallbacks for scenarios that can't happen in
  this system's actual account model — see `docs/ARCHITECTURE.md` for what
  the account constraints already guarantee before adding a runtime check
  Anchor's own type system already enforces.
- Don't reach for encryption to "fix" the privacy model — the design is
  intentionally access-control-based (see `docs/SECURITY.md`); if you think
  that's insufficient for some case, open an issue to discuss before
  implementing.
- Don't touch `RELAY_SPONSOR_SECRET_KEY` handling without reading
  `docs/SECURITY.md`'s relay section first — never log it, never widen the
  program-ID allowlist in `frontend/lib/relayServer.ts` without a documented
  reason.
