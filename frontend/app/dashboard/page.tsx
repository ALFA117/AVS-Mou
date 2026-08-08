"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatEquity, formatTokenAmount, shortenAddress } from "@/lib/format";
import { downloadCsv, positionsToCsv } from "@/lib/csv";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  voting: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  liquidated: "bg-muted text-muted-foreground",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { positions, loading } = usePortfolio();
  const reducedMotion = useReducedMotion();

  const totalInvested = positions.reduce((sum, p) => sum + Number(p.bidAmount), 0);
  const activeCount = positions.filter((p) => p.status !== "liquidated").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
      </div>

      {!publicKey ? (
        <p className="mt-10 text-center text-muted-foreground">
          Connect your wallet to see your positions.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Total invested" value={formatTokenAmount(totalInvested)} />
            <MetricCard label="Active positions" value={String(activeCount)} />
            <MetricCard
              label="Wallet"
              value={shortenAddress(publicKey.toBase58())}
              icon={<Wallet className="h-3.5 w-3.5 text-primary" strokeWidth={2} />}
            />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">Positions</h2>
            {positions.length > 0 && (
              <button
                onClick={() => downloadCsv("avs-portfolio.csv", positionsToCsv(positions))}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2} />
                Export CSV
              </button>
            )}
          </div>

          {loading && <p className="mt-4 text-sm text-muted-foreground">Loading positions…</p>}
          {!loading && positions.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No positions yet.{" "}
              <Link href="/deals" className="text-primary underline">
                Browse open deals
              </Link>
              .
            </p>
          )}

          <motion.div
            variants={reducedMotion ? undefined : container}
            initial={reducedMotion ? undefined : "hidden"}
            animate={reducedMotion ? undefined : "show"}
            className="mt-4 space-y-2"
          >
            {positions.map((p) => (
              <motion.div key={p.dealPublicKey} variants={reducedMotion ? undefined : item}>
                <Link
                  href={`/syndicates/${p.dealPublicKey}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium text-card-foreground">{p.dealTitle}</p>
                    <p className="font-mono-avs text-xs text-muted-foreground">
                      Bid: {formatTokenAmount(p.bidAmount)} · Equity:{" "}
                      {Number(p.equityAllocated) > 0 ? formatEquity(p.equityAllocated) : "pending"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </main>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 font-mono-avs text-xl font-semibold text-card-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}
