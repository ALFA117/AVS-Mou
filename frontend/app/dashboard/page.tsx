"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatEquity, formatTokenAmount, shortenAddress } from "@/lib/format";
import { downloadCsv, positionsToCsv } from "@/lib/csv";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  voting: "bg-amber-100 text-amber-800",
  liquidated: "bg-neutral-200 text-neutral-700",
};

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { positions, loading } = usePortfolio();

  const totalInvested = positions.reduce((sum, p) => sum + Number(p.bidAmount), 0);
  const activeCount = positions.filter((p) => p.status !== "liquidated").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {!publicKey ? (
        <p className="mt-10 text-center text-neutral-500">
          Connect your wallet to see your positions.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Total invested" value={formatTokenAmount(totalInvested)} />
            <MetricCard label="Active positions" value={String(activeCount)} />
            <MetricCard label="Wallet" value={shortenAddress(publicKey.toBase58())} />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Positions</h2>
            {positions.length > 0 && (
              <button
                onClick={() => downloadCsv("avs-portfolio.csv", positionsToCsv(positions))}
                className="text-sm text-neutral-500 hover:text-neutral-800"
              >
                Export CSV
              </button>
            )}
          </div>

          {loading && <p className="mt-4 text-sm text-neutral-500">Loading positions…</p>}
          {!loading && positions.length === 0 && (
            <p className="mt-4 text-sm text-neutral-500">
              No positions yet. <Link href="/deals" className="underline">Browse open deals</Link>.
            </p>
          )}

          <div className="mt-4 space-y-2">
            {positions.map((p) => (
              <Link
                key={p.dealPublicKey}
                href={`/syndicates/${p.dealPublicKey}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:border-neutral-400"
              >
                <div>
                  <p className="font-medium">{p.dealTitle}</p>
                  <p className="text-xs text-neutral-500">
                    Bid: {formatTokenAmount(p.bidAmount)} · Equity:{" "}
                    {Number(p.equityAllocated) > 0 ? formatEquity(p.equityAllocated) : "pending"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
