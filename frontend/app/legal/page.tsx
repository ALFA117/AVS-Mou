export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Legal</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Disclaimer</h2>
        <p className="mt-2 text-sm text-neutral-600">
          AVS is a hackathon project (Solana Blitz V7). Nothing here is financial, legal, or tax
          advice. Deals shown are not vetted or endorsed by AVS. Devnet deployments use test
          tokens with no monetary value — do not send real funds to any address associated with
          this app on devnet.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Terms of Service</h2>
        <p className="mt-2 text-sm text-neutral-600">
          By using this app you acknowledge it is experimental software provided as-is, with no
          warranty of any kind. Smart contracts have not been audited. Use at your own risk.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Privacy Policy</h2>
        <p className="mt-2 text-sm text-neutral-600">
          This app does not run its own backend or collect personal data — all state lives
          on-chain (public deal terms, sealed bids/votes) or in your browser&apos;s local storage
          (session keys, chat messages — see docs/SESSION_KEYS.md and lib/chatStore.ts in the
          repo). No analytics or tracking scripts are included.
        </p>
      </section>
    </main>
  );
}
