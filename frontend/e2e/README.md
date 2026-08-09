# Playwright smoke suite

Covers pages that render without a real wallet connection: the landing
page, the deals list, about/faq/legal, and the status page (which now
shows all three programs as deployed — see the AVS-Mou commit history).

**Deliberately out of scope:** any transactional flow — placing a bid,
casting a vote, creating a deal. Those all require either a real browser
wallet extension (Phantom/Solflare) or a hand-rolled `window.solana`/
wallet-adapter mock that reimplements enough of the real extension's
`connect`/`signTransaction`/`signMessage` surface to pass wallet-adapter's
own detection — a nontrivial thing to get right, and a fake wallet
provider is exactly the kind of thing that's easy to write incorrectly in
a way that says nothing about whether the real integration works. The
actual bidding/voting/deal-creation flows are proven against real Devnet
in `tests/*.ts` (`RUN_*_DEVNET_E2E=1`) instead — that's a stronger
guarantee than a mocked browser wallet would give.

## Running

```bash
cd frontend
npm run build   # playwright's webServer runs `next start`, which needs a build
npx playwright test
```
