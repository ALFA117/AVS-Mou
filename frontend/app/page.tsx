import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Anonymous Venture Syndicate</h1>
      <p className="mx-auto mt-4 max-w-xl text-neutral-600">
        Sealed-bid deal syndicates on Solana. Bid or vote in secret — everyone reveals at once,
        via MagicBlock&apos;s Ephemeral Rollups.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/deals"
          className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Browse Deals
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50"
        >
          My Dashboard
        </Link>
      </div>
    </main>
  );
}
