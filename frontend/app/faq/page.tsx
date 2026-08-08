const FAQS: { q: string; a: string }[] = [
  {
    q: "Is my bid really private?",
    a: "Yes — it's stored on an Ephemeral Rollup account gated by MagicBlock's private-permission system, naming only you and the startup as readers. It stays that way until the deal's reveal instruction runs after the deadline.",
  },
  {
    q: "Can the startup see my bid amount before reveal?",
    a: "No. The same access-control permission that hides your bid from other bidders also hides it from the startup until reveal.",
  },
  {
    q: "What if I want to change my bid?",
    a: "sealed-auction doesn't currently support editing a placed bid — each bidder gets one bid PDA per deal. Revoke/re-bid support is tracked as future work.",
  },
  {
    q: "How do I know the reveal is fair?",
    a: "Reveal logic runs entirely on-chain: reveal_deal scans every bid account, sums the total raised, and there's no discretionary step where a party could hide or alter a bid. Milestone reward settlement additionally gates on a verifiable random function (VRF) so payout order can't be front-run.",
  },
  {
    q: "Why do I sometimes not need to approve a wallet popup?",
    a: "Session keys — once you authorize a disposable signing key with one wallet signature, it can sign bids/votes on your behalf until it expires (default 1 hour) or you revoke it. See the Authorize/Revoke controls when you place a bid or vote.",
  },
  {
    q: "Why can't I place a real bid right now?",
    a: "sealed-auction's place_bid currently requires the deal's own startup wallet to co-sign as rent-sponsor. A relay backend that lets any investor bid is planned but not built yet — see the project README for status.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">FAQ</h1>
      <div className="mt-6 space-y-6">
        {FAQS.map((item) => (
          <div key={item.q}>
            <h2 className="font-medium">{item.q}</h2>
            <p className="mt-1 text-sm text-neutral-600">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
