import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">About AVS</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Why privacy matters</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Public cap tables and bid histories let competitors reverse-engineer an angel&apos;s
          strategy, and let founders play investors off each other during a raise. AVS keeps bid
          and vote amounts sealed — invisible to everyone, including the startup — until a fixed
          reveal moment, so every participant commits without seeing anyone else&apos;s move.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
          <li>A startup posts a deal — valuation, equity offered, min investment, deadline.</li>
          <li>Angels place sealed bids. Amounts are hidden by an on-chain access-control
            permission, not client-side encryption — provably unreadable until reveal.</li>
          <li>After the deadline, the deal reveals: every bid becomes visible at once, and
            equity is allocated proportionally to each bid&apos;s share of the total raised.</li>
          <li>Syndicate members privately vote YES/NO on startup-proposed milestones, with
            rewards settled once verifiable randomness (VRF) gates payout.</li>
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Tech</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Three Anchor programs on Solana (sealed-auction, private-voting, spl-token-manager),
          built on{" "}
          <a href="https://magicblock.gg" className="underline" target="_blank" rel="noreferrer">
            MagicBlock
          </a>{" "}
          Ephemeral Rollups for private, gasless execution, with session keys for one-tap
          signing. Built for the Solana Blitz V7 Hackathon.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Links</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/faq" className="underline">FAQ</Link>
          </li>
          <li>
            <Link href="/legal" className="underline">Terms &amp; Privacy</Link>
          </li>
          <li>
            <a
              href="https://github.com/ALFA117/AVS-Mou"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
