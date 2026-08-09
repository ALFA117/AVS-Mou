# Security

This is a hackathon-scoped project (Solana Blitz V7). It has **not** had a
third-party audit. Treat everything below as "here's the actual threat
model we designed against," not a certification.

## Reporting a vulnerability

Open a GitHub issue on this repo, or if it's something you'd rather not put
in a public issue first, contact the maintainer directly through their
GitHub profile. There's no bug bounty — this is an unfunded hackathon
project — but real reports are read and acted on.

## Privacy model — what's actually private

Bid amounts and vote choices are **access-controlled, not encrypted**.
There is no ciphertext anywhere in this system. A bid/vote account lives
only on MagicBlock's Private Ephemeral Rollup, behind an
`EphemeralPermission` account that names exactly which pubkeys (the
bidder/voter + the startup) may read it, until `reveal_deal`/
`reveal_milestone` runs after the deadline and makes the tally public. See
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the full account model.

Practical implication: privacy here depends on the correctness and
integrity of MagicBlock's TEE-based Ephemeral Rollup and its permission
enforcement — not on a cryptographic hardness assumption we control. If the
ER's TEE attestation or permission enforcement were compromised, sealed
bid/vote data would be exposed early. This is a real trust assumption of
the design, not a bug to "fix" — see MagicBlock's own docs for their TEE
threat model.

## Session keys

Session keys (`docs/SESSION_KEYS.md`) trade off convenience against a
bounded, well-understood risk:

- A session signer is a disposable keypair stored in **plaintext in
  `localStorage`** (`frontend/lib/sessionKeys.ts`). This is not secure
  against XSS on the app's own origin — a successful XSS attack could
  exfiltrate an active session key.
- The blast radius of a leaked session key is bounded: it's scoped to one
  program (`sealed-auction` or `private-voting`), one real wallet, until a
  fixed expiry (default 1 hour, `SESSION_KEY_LIFETIME_SECONDS`), and it
  cannot revoke itself or mint a new session (`revokeSessionV2` requires
  the real wallet's signature).
- A leaked session key **cannot** drain funds beyond whatever the investor
  separately SPL-`approve`d it to move for `place_bid` — session validity
  and SPL delegate authority are independent checks (see `place_bid`'s doc
  comment in `programs/sealed-auction/src/lib.rs`).
- Keep the standard web security hygiene that makes this bound hold:
  sanitize any user-controlled content rendered in the app (deal
  descriptions, milestone text), don't add `dangerouslySetInnerHTML`
  without review, keep CSP/dependency hygiene up to date.

## Relay backend

The relay (`frontend/lib/relayServer.ts`, `docs/RELAY.md`) holds a funded
Devnet keypair (`RELAY_SPONSOR_SECRET_KEY`) server-side to sponsor
`place_bid`/`cast_vote` rent and fees.

- **Never** commit `.env.local` / `.env.testnet` or log
  `RELAY_SPONSOR_SECRET_KEY`. It's gitignored (`.gitignore` excludes
  `.env*.local` and friends) — double-check `git status` before committing
  if you ever hand-edit env handling.
- The sponsor keypair is scoped to Devnet in this project's current
  deployment. If you deploy to mainnet, use a keypair funded with only as
  much SOL as sponsoring near-term traffic requires, and rotate it if you
  suspect exposure — a leaked sponsor key can be drained of its SOL (not of
  user funds; it never custodies bid/vote amounts, only pays rent/fees) or
  used to spam-sponsor arbitrary transactions up to whatever the allowlist
  in `relayServer.ts` permits.
- Defense-in-depth allowlist (`assertRelayableTransaction`,
  `assertFeePayerIsSponsor` in `frontend/lib/relayServer.ts`): the relay
  only signs transactions whose fee payer is already the sponsor, with 1–2
  instructions, all targeting `sealed-auction`/`private-voting` program
  IDs. This is a second layer on top of the on-chain program's own account
  constraints, not a replacement for them — the programs must remain safe
  even if this allowlist were bypassed.
- The relay never signs the *first* signature — it only counter-signs a
  transaction already signed by the real investor/member or their session
  key. It cannot originate a `place_bid`/`cast_vote` on anyone's behalf.

## Known open issues with security relevance

See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for full detail. None of these are
exploitable to steal funds or break the sealed-bid/vote privacy guarantee;
they're operational bugs in the undelegate-back-to-L1 path:

- `undelegate_deal` / `undelegate_milestone` fail with
  `ExternalAccountDataModified` — state gets stuck on the ER rather than
  returning to L1. Funds already moved correctly by the time this runs.
- `delegate_equity_account` doesn't move an existing L1 balance into the ER
  vault, so a freshly delegated equity account can fail `transfer_equity`
  with `InsufficientFunds` on the ER side even though L1 shows a real
  balance. No funds are lost — the L1 balance is untouched and a plain L1
  transfer still works.
- `undelegate_equity_account` uses the wrong delegation builder for a
  Token-program-owned account and fails outright (`InvalidAccountOwner`).

## Dependencies

Contract dependencies are pinned exactly (`anchor-lang = "=1.0.2"`, etc.)
rather than left on a caret range, specifically so a transitive dependency
bump can't silently change program behavior between a local build and a
deployed one. `Cargo.lock` is committed and intentionally kept at lockfile
`version = 3` — see the comment in `.github/workflows/ci.yml` for why.
Before bumping any pinned version, re-verify the new version's actual
release notes rather than assuming semver compatibility; this project has
already been bitten once by an assumed-compatible CLI/toolchain bump (see
the CI history around `SOLANA_VERSION`/`ANCHOR_VERSION`/`NODE_VERSION` in
`.github/workflows/ci.yml`'s comments).
