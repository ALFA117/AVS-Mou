# Relay backend

`sealed-auction`'s `place_bid` and `private-voting`'s `cast_vote` each need a
funded `payer: Signer` to cover the new `Bid`/`Vote` account's rent (a few
thousand lamports) and the transaction fee. Earlier, `payer` was constrained
to equal the deal's/milestone's `startup` wallet — a placeholder that only
let the startup test their own deal, since no real investor holds that
wallet's key. That constraint has been removed; `payer` can now be any
funded signer, and this relay is that signer.

## Why a relay instead of having investors pay their own rent

The product's whole pitch is gasless, session-key-driven bidding/voting —
an investor should never need to hold devnet (or mainnet) SOL just to
participate. The relay is a small trusted service that only ever adds one
thing to a transaction: its own signature as fee-payer.

## Architecture

```
investor wallet / session key          relay (Next.js API routes)         Devnet
──────────────────────────────         ───────────────────────────        ──────
1. Build tx via Anchor .transaction()
2. Set feePayer = sponsor pubkey
   (fetched from GET /api/relay/sponsor)
3. Partial-sign as bidder/voter    ──►  POST /api/relay/submit
                                         4. Deserialize
                                         5. Verify feePayer == sponsor
                                         6. Verify every instruction's
                                            programId is sealed-auction
                                            or private-voting (nothing else)
                                         7. tx.partialSign(sponsor)
                                         8. sendRawTransaction       ──►  confirmed
                                    ◄──  9. Return signature
10. connection.confirmTransaction
```

The relay never sees bid amounts or vote choices in the clear any
differently than a normal RPC node would — it only adds a signature to a
transaction the investor already built and signed. It cannot alter the
instruction data (that would invalidate the investor's/session key's
signature), and the program-id allowlist (`frontend/lib/relayServer.ts`)
means it can't be repurposed as a general-purpose fee-payer for unrelated
transactions.

## Components

- `frontend/lib/relayServer.ts` — server-only: loads the sponsor keypair
  from `RELAY_SPONSOR_SECRET_KEY`, and the allowlist/validation helpers.
- `frontend/app/api/relay/sponsor/route.ts` — `GET`, returns the sponsor's
  public key so clients know what to set as `payer`/`feePayer`.
- `frontend/app/api/relay/submit/route.ts` — `POST { transaction: base64 }`,
  validates, co-signs, broadcasts, returns `{ signature }`.
- `frontend/lib/relayClient.ts` — client-side helpers used by `BidForm.tsx`
  and `VoteCard.tsx` (`fetchRelaySponsorPubkey`, `submitViaRelay`).

## Setup

```bash
solana-keygen new --no-bip39-passphrase --outfile relay-sponsor.json
solana address -k relay-sponsor.json          # note the pubkey
solana transfer --allow-unfunded-recipient --url devnet <pubkey> 0.2
```

Put the keypair's JSON array into `frontend/.env.local` (gitignored):

```
RELAY_SPONSOR_SECRET_KEY=[12,34,...]
```

0.2 SOL covers roughly 200+ bids/votes at current Devnet rent rates (the
`Bid`/`Vote` accounts are well under 200 bytes). Top up the same way if it
runs low — check with `solana balance <pubkey> --url devnet`.

## Known limitations

- Single sponsor keypair, no key rotation or multi-sig. Fine for a
  hackathon devnet deployment; a production deploy would want a proper
  custody setup (KMS-backed signer, rate limiting per investor, etc.).
- No persistence/logging of relayed transactions beyond what Solana's own
  ledger provides — there's no separate audit trail today.
- The relay is unauthenticated (anyone can POST to `/api/relay/submit`).
  The allowlist + on-chain constraints bound the blast radius to "pay rent
  for a legitimate bid/vote." A per-IP rate limit (`lib/rateLimiter.ts`,
  20 req/min) now caps how fast that can happen, but it's in-memory and
  per-serverless-instance — real protection before a production deployment
  would still want a shared store (Upstash/Redis) and per-investor limits,
  not just per-IP.
