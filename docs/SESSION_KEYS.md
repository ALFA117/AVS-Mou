# Session Keys

Why bidding/voting doesn't pop up a wallet approval on every action, how
that's implemented, and what it does and doesn't protect against.

## Why

AVS's core flows are high-frequency by design: an angel might place several
bids across deals in one sitting, a syndicate member might vote on several
milestones. A wallet popup per transaction (Phantom/Solflare/etc.) is the
single biggest UX tax in Solana apps with this shape. Session keys remove it
for exactly two actions — `place_bid` and `cast_vote` — while keeping fund
custody and session-creation itself gated by the real wallet.

## How it works

1. **One-time authorization.** The browser generates a disposable keypair
   (the "session signer") and asks the user's real wallet to sign **one**
   transaction: `createSessionV2`, calling into a shared, pre-deployed
   on-chain program (`session-keys`, program id
   `KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5` — not something AVS
   deploys itself, the same program every MagicBlock example that uses
   session keys points at). This mints a `SessionTokenV2` PDA recording:
   - `authority` — the real wallet
   - `session_signer` — the disposable keypair's public key
   - `target_program` — which of our programs (sealed-auction or
     private-voting) this session is scoped to
   - `valid_until` — expiry (defaults to 1 hour; see
     `frontend/lib/sessionKeys.ts`)
2. **Every bid/vote after that** is signed by the disposable keypair alone —
   no wallet interaction. `place_bid` and `cast_vote` both take the real
   wallet's pubkey as an explicit argument (`investor` / `member`) plus an
   optional `session_token` account; the instruction accepts the call if
   *either* the direct signer equals that pubkey (no session in use) *or* a
   valid session token proves the signer is authorized for it.
3. **Revocation** (`revokeSessionV2`) requires the real wallet's signature,
   not the session key's — a compromised session key can't revoke itself
   and mint a new one.

## On-chain validation (why it's not the `session-keys` crate's own macros)

The `session-keys` crate ships `#[session_auth_or(...)]` and
`#[session(signer = ..., authority = ...)]` macros (see
`vendor/magicblock-engine-examples/session-keys`). Both generate code of
the shape `self.<authority-expression>` — i.e. `authority` must be an
**existing account field** on the accounts struct (like `counter.authority`
in the vendor example, set at a prior `initialize` call). AVS's `place_bid`
and `cast_vote` don't have that: the investor/member's identity is supplied
fresh on every call, not read off some pre-existing account, so
`authority = investor` doesn't compile (`investor` is an instruction
argument, not a struct field — confirmed by trying it; see git history on
`programs/sealed-auction/src/lib.rs`).

Instead, both programs validate sessions with a plain Anchor account
constraint:

```rust
#[account(
    seeds = [
        SessionTokenV2::SEED_PREFIX.as_bytes(),
        crate::ID.as_ref(),
        bidder.key().as_ref(),
        investor.as_ref(),
    ],
    bump,
    seeds::program = session_keys::ID
)]
pub session_token: Option<Account<'info, SessionTokenV2>>,
```

The PDA's seeds already bind it to exactly this (program, signer, real
wallet) triple — if the account passed in doesn't match those seeds,
Anchor rejects the whole transaction before the handler even runs. The
handler only needs one runtime check: expiry.

```rust
let session_valid = match &ctx.accounts.session_token {
    Some(token) => !token.is_expired()?,
    None => false,
};
require!(
    ctx.accounts.bidder.key() == investor || session_valid,
    ErrorCode::InvalidSession
);
```

This is functionally equivalent to what the crate's macros do (PDA
derivation proof + expiry check), just expressed with Anchor's native
constraint system instead of a macro that assumes a different account
shape.

## Error handling

Both programs surface a single `ErrorCode::InvalidSession` when neither
condition holds (wrong direct signer, missing session, or expired session)
— see `programs/sealed-auction/src/error.rs` /
`programs/private-voting/src/error.rs`. The underlying `session-keys`
crate's own `SessionError` enum (`ValidityTooLong`, `NoToken`,
`InvalidToken`, etc.) only surfaces from the shared session-keys program
itself, during `createSessionV2`/`revokeSessionV2` — not from our
programs, since we don't call into its validation code path.

## What session keys do and don't protect against

- **Do**: bound the blast radius of a compromised session key to a single
  program, for a single wallet, until a fixed expiry, without ever holding
  the real wallet's private key.
- **Don't**: give the session key custody of funds beyond what the
  investor has separately SPL-`approve`d it to move (see sealed-auction's
  `place_bid` doc comment) — session validity and SPL delegate authority
  are two independent checks.
- **Don't**: protect against XSS on the frontend's own origin. The session
  keypair lives in `localStorage` in plaintext (see
  `frontend/lib/sessionKeys.ts`) — acceptable because of the bounded blast
  radius above, not because localStorage is secure.

## Client-side flow

See `frontend/lib/sessionKeys.ts` (`createSession`, `revokeSession`,
`loadSession`) and `frontend/hooks/useSessionKey.ts` /
`frontend/components/SessionKeyPanel.tsx` for the "Authorize with wallet
(one-time)" / "Authorized till [time]" / revoke UI.
