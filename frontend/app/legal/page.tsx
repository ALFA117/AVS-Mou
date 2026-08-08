import { CircleAlert, FileText, Lock } from "lucide-react";

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">Legal</h1>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <CircleAlert className="h-4 w-4 text-primary" strokeWidth={2} />
          Disclaimer
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AVS is a hackathon project (Solana Blitz V7). Nothing here is financial, legal, or tax
          advice. Deals shown are not vetted or endorsed by AVS. Devnet deployments use test
          tokens with no monetary value — do not send real funds to any address associated with
          this app on devnet.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" strokeWidth={2} />
          Terms of Service
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          By using this app you acknowledge it is experimental software provided as-is, with no
          warranty of any kind. Smart contracts have not been audited. Use at your own risk.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Lock className="h-4 w-4 text-primary" strokeWidth={2} />
          Privacy Policy
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This app does not run its own backend or collect personal data — all state lives
          on-chain (public deal terms, sealed bids/votes) or in your browser&apos;s local storage
          (session keys, chat messages — see docs/SESSION_KEYS.md and lib/chatStore.ts in the
          repo). No analytics or tracking scripts are included.
        </p>
      </section>
    </main>
  );
}
